import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/user.schema';
import { Asset } from './schema/asset.schema';
import { Trade } from './schema/trade.schema';
import { OpenTradeDto } from './dtos/open-trade.dto';
import { ReferralService } from '../referral/referral.service';
import { CopyTradeService } from '../copy-trade/copy-trade.service';
import axios from 'axios';

interface PriceResponse {
  [key: string]: { usd: number };
}

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);
  private config = { payoutPercentage: 80, expirySeconds: 60, spread: 0.01, delay: 1000 };

  private readonly AVAILABLE_ASSETS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE'];

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Asset') private assetModel: Model<Asset>,
    @InjectModel('Trade') private tradeModel: Model<Trade>,
    private referralService: ReferralService,
    private copyTradeService: CopyTradeService,
  ) {}

  async openTrade(userId: string, dto: OpenTradeDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const assetUpper = dto.asset.toUpperCase();
    if (!this.AVAILABLE_ASSETS.includes(assetUpper)) {
      throw new Error('Asset not available');
    }

    const balanceType = dto.type === 'demo' ? 'demoBalance' : 'realBalance';
    if (user[balanceType] < dto.amount) throw new Error('Insufficient balance');

    user[balanceType] -= dto.amount;
    await user.save();

    const openPrice = await this.getCurrentPrice(assetUpper);

    const trade = new this.tradeModel({
      userId,
      asset: assetUpper,
      amount: dto.amount,
      direction: dto.direction,
      type: dto.type || user.activeMode,
      openPrice,
      status: 'open',
      expiryTime: new Date(Date.now() + this.config.expirySeconds * 1000),
      isCopy: false,
    });
    await trade.save();

    // Copy Trading
    if (user.isLeader && user.followers?.length > 0) {
      const followers = await this.userModel.find({ _id: { $in: user.followers } });
      for (const follower of followers) {
        const fBalanceType = trade.type === 'demo' ? 'demoBalance' : 'realBalance';
        if (follower[fBalanceType] >= dto.amount) {
          follower[fBalanceType] -= dto.amount;
          await follower.save();

          const copyTrade = new this.tradeModel({
            userId: follower._id,
            asset: assetUpper,
            amount: dto.amount,
            direction: dto.direction,
            type: trade.type,
            openPrice,
            status: 'open',
            expiryTime: trade.expiryTime,
            isCopy: true,
            copiedFrom: userId,
          });
          await copyTrade.save();
        }
      }
    }

    setTimeout(() => this.processTradeExpiry(trade._id.toString()), this.config.expirySeconds * 1000);

    return { message: 'Trade opened', tradeId: trade._id };
  }

  private async processTradeExpiry(tradeId: string) {
    const trade = await this.tradeModel.findById(tradeId);
    if (!trade || trade.status === 'closed') return;

    const closePrice = await this.getCurrentPrice(trade.asset);

    const win = 
      (trade.direction === 'up' && closePrice > (trade.openPrice || 0)) ||
      (trade.direction === 'down' && closePrice < (trade.openPrice || 0));

    const payout = win ? trade.amount * (this.config.payoutPercentage / 100) : 0;

    trade.status = 'closed';
    trade.closePrice = closePrice;
    trade.result = win ? 'win' : 'loss';
    trade.payout = payout;
    await trade.save();

    const user = await this.userModel.findById(trade.userId);
    if (user) {
      const balanceType = trade.type === 'demo' ? 'demoBalance' : 'realBalance';
      user[balanceType] += trade.amount + payout;
      await user.save();

      // Referral commission
      if (user.parentReferral) {
        await this.referralService.creditTradeCommission(trade.userId, payout);
      }
    }

    // Copy trades
    const copyTrades = await this.tradeModel.find({ copiedFrom: trade.userId, status: 'open', isCopy: true });
    for (const ct of copyTrades) {
      ct.status = 'closed';
      ct.closePrice = closePrice;
      ct.result = win ? 'win' : 'loss';
      ct.payout = payout;
      await ct.save();

      const fUser = await this.userModel.findById(ct.userId);
      if (fUser) {
        const fBalanceType = ct.type === 'demo' ? 'demoBalance' : 'realBalance';
        fUser[fBalanceType] += ct.amount + payout;
        await fUser.save();
      }
    }
  }

  private async getCurrentPrice(asset: string): Promise<number> {
    const mapping: Record<string, string> = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      BNB: 'binancecoin',
      SOL: 'solana',
      XRP: 'ripple',
      ADA: 'cardano',
      DOGE: 'dogecoin',
    };

    const id = mapping[asset];
    if (!id) return 60000 + Math.random() * 20000;

    try {
      const res = await axios.get<PriceResponse>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      );
      return res.data[id].usd;
    } catch {
      return 60000 + Math.random() * 20000;
    }
  }

  async getHistory(filter: any) {
    return this.tradeModel.find(filter).sort({ createdAt: -1 });
  }

  async getOpenTrades() {
    return this.tradeModel.find({ status: 'open' });
  }

  async getClosedTrades() {
    return this.tradeModel.find({ status: 'closed' });
  }

  async updateAsset(assetId: string, updates: any) {
    return this.assetModel.findByIdAndUpdate(assetId, updates, { new: true });
  }

  async updateConfig(newConfig: any) {
    Object.assign(this.config, newConfig);
    return this.config;
  }
}