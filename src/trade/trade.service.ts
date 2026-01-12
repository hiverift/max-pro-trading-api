import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

import { User } from '../auth/user.schema';
import { Asset } from './schema/asset.schema';
import { Trade } from './schema/trade.schema';
import { OpenTradeDto } from './dtos/open-trade.dto';
import { ReferralService } from '../referral/referral.service';
import { CopyTradeService } from '../copy-trade/copy-trade.service';

import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';

interface PriceResponse { 
  [key: string]: { usd: number };
}

@Injectable()
export class TradeService {
  private readonly logger = new Logger(TradeService.name);

  private config = {
    payoutPercentage: 80,
    expirySeconds: 60,
    spread: 0.01,
    delay: 1000,
  };

  private readonly AVAILABLE_ASSETS = [
    'BTC',
    'ETH',
    'BNB',
    'SOL',
    'XRP',
    'ADA',
    'DOGE',
  ];

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Asset') private assetModel: Model<Asset>,
    @InjectModel('Trade') private tradeModel: Model<Trade>,
    private referralService: ReferralService,
    private copyTradeService: CopyTradeService,
  ) { }

  // ===================== OPEN TRADE =====================
  async openTrade(userId: string, dto: OpenTradeDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');


    if (dto.type === 'real' && user.kycStatus !== 'approved') {
      throw new CustomError(403, 'KYC approval required for real trades');
    }

    const assetUpper = dto.asset.toUpperCase();
    if (!this.AVAILABLE_ASSETS.includes(assetUpper)) {
      throw new CustomError(400, 'Asset not available or disabled');
    }

    const balanceType = dto.type === 'demo' ? 'demoBalance' : 'realBalance';
    if ((user[balanceType] || 0) < dto.amount) {
      throw new CustomError(400, 'Insufficient balance');
    }


    user[balanceType] -= dto.amount;
    await user.save();

    const openPrice = await this.getCurrentPrice(assetUpper);

    const expiryTime = new Date(Date.now() + this.config.expirySeconds * 1000);

    const trade = new this.tradeModel({
      userId,
      asset: assetUpper,
      amount: dto.amount,
      direction: dto.direction,
      type: dto.type,
      openPrice,
      status: 'open',
      expiryTime,
      isCopy: false,
    });

    await trade.save();

    if (user.isLeader && user.followers && user.followers.length > 0) {
      const followers = await this.userModel.find({ _id: { $in: user.followers } });

      for (const follower of followers) {
        const fBalanceType = dto.type === 'demo' ? 'demoBalance' : 'realBalance';

        if ((follower[fBalanceType] || 0) >= dto.amount) {
          follower[fBalanceType] -= dto.amount;
          await follower.save();

          const copyTrade = new this.tradeModel({
            userId: follower._id,
            asset: assetUpper,
            amount: dto.amount,
            direction: dto.direction,
            type: dto.type,
            openPrice,
            status: 'open',
            expiryTime,
            isCopy: true,
            copiedFrom: userId,
          });

          await copyTrade.save();
        }
      }
    }


    setTimeout(() => {
      this.processTradeExpiry(trade._id.toString()).catch(err => {
        console.error('Expiry processing failed:', err);
      });
    }, this.config.expirySeconds * 1000);

    return new CustomResponse(200, 'Trade opened successfully', {
      tradeId: trade._id,
      asset: assetUpper,
      amount: dto.amount,
      direction: dto.direction,
      expiryInSeconds: this.config.expirySeconds,
      openPrice,
    });
  }


  private async processTradeExpiry(tradeId: string) {
    const trade = await this.tradeModel.findById(tradeId);
    if (!trade || trade.status === 'closed') {
      console.log(`Trade expiry skipped: ${tradeId} (not found or already closed)`);
      return;
    }
    if (!trade.openPrice) {
      console.error(`Open price missing for trade ${tradeId}`);
      return;
    }
    const closePrice = await this.getCurrentPrice(trade.asset);

    const spread = this.config.spread || 0.0001;
    const adjustedOpen = trade.openPrice * (1 + (trade.direction === 'up' ? spread : -spread));
    const win =
      (trade.direction === 'up' && closePrice > adjustedOpen) ||
      (trade.direction === 'down' && closePrice < adjustedOpen);

    const payout = win
      ? trade.amount * (this.config.payoutPercentage / 100)
      : 0;

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

      if (user.parentReferral && this.referralService) {
        try {
          await this.referralService.creditTradeCommission(trade.userId, payout);
        } catch (err) {
          console.error('Referral commission error:', err);
        }
      }
    }


    const copyTrades = await this.tradeModel.find({
      copiedFrom: trade.userId,
      status: 'open',
      isCopy: true,
    });

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

  // ===================== READ =====================
  async getHistory(filter: any) {
    const data = await this.tradeModel
      .find(filter)
      .sort({ createdAt: -1 });

    return new CustomResponse(200, 'Trade history fetched', data);
  }

  async getOpenTrades() {
    const data = await this.tradeModel.find({
      status: 'open',
    });
    return new CustomResponse(200, 'Open trades fetched', data);
  }

  async getClosedTrades() {
    const data = await this.tradeModel.find({
      status: 'closed',
    });
    return new CustomResponse(200, 'Closed trades fetched', data);
  }

  async updateAsset(assetId: string, updates: any) {
    const asset = await this.assetModel.findByIdAndUpdate(
      assetId,
      updates,
      { new: true },
    );

    return new CustomResponse(200, 'Asset updated', asset);
  }

  async updateConfig(newConfig: any) {
    Object.assign(this.config, newConfig);
    return new CustomResponse(200, 'Trade config updated', this.config);
  }
}
