import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import axios from 'axios';

import { User } from '../auth/user.schema';
import { Asset } from './schema/asset.schema';
import { Trade } from './schema/trade.schema';
import { OpenTradeDto } from './dtos/open-trade.dto';
import { ReferralService } from '../referral/referral.service';
import { CopyTradeService } from '../copy-trade/copy-trade.service';
import { TradeSettings } from './schema/settings.schema';
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
    spread: 0.0001,
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
    @InjectModel('TradeSettings') private settingsModel: Model<TradeSettings>,
    private referralService: ReferralService,
    private copyTradeService: CopyTradeService,
  ) { }

  // ===================== CENTRAL TRY-CATCH =====================
  private async safeExecute<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      this.logger.error(error?.message || error, error?.stack);

      if (error instanceof CustomError) throw error;
      if (error?.status) throw error;

      throw new CustomError(
        error?.status || 500,
        error?.message || 'Internal server error',
      );
    }
  }

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

    // Deduct amount PERMANENTLY
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

    // Copy trade logic (if leader)
    if (user.isLeader && user.followers?.length > 0) {
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

    // Schedule expiry
    setTimeout(() => {
      this.processTradeExpiry(trade._id.toString()).catch(err => {
        this.logger.error('Expiry processing failed:', err);
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

  // ===================== PROCESS EXPIRY =====================
  private async processTradeExpiry(tradeId: string) {
    try {
      const trade = await this.tradeModel.findById(tradeId);
      if (!trade || trade.status !== 'open') return;

      const closePrice = await this.getCurrentPrice(trade.asset);
      const spread = this.config.spread;

      const adjustedOpen =
        trade.openPrice *
        (1 + (trade.direction === 'up' ? spread : -spread));

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
        const balanceType =
          trade.type === 'demo' ? 'demoBalance' : 'realBalance';
        user[balanceType] += trade.amount + payout;
        await user.save();

        if (trade.type === 'real' && user.parentReferral) {
          await this.referralService.creditTradeCommission(
            trade.userId,
            payout,
          );
        }
      }

      const copyTrades = await this.tradeModel.find({
        copiedFrom: trade.userId,
        isCopy: true,
        status: 'open',
      });

      for (const ct of copyTrades) {
        ct.status = 'closed';
        ct.closePrice = closePrice;
        ct.result = win ? 'win' : 'loss';
        ct.payout = payout;
        await ct.save();

        const fUser = await this.userModel.findById(ct.userId);
        if (fUser) {
          const fBalanceType =
            ct.type === 'demo' ? 'demoBalance' : 'realBalance';
          fUser[fBalanceType] += ct.amount + payout;
          await fUser.save();
        }
      }
    } catch (error) {
      this.logger.error('Trade expiry failed', error);
    }
  }

  // ===================== ADMIN / ASSET =====================
  async getAssets() {
    return this.safeExecute(async () => this.assetModel.find());
  }

  async toggleAsset(symbol: string, enabled: boolean) {
    return this.safeExecute(async () => {
      const asset = await this.assetModel.findOneAndUpdate(
        { symbol: symbol.toUpperCase() },
        { enabled },
        { new: true },
      );
      return new CustomResponse(200, 'Asset updated', asset);
    });
  }

  async getTradeSettings() {
    return this.safeExecute(async () => {
      let settings = await this.settingsModel.findOne();
      if (!settings) settings = await this.settingsModel.create(this.config);
      return new CustomResponse(200, 'Trade settings fetched', settings);
    });
  }

  async updateTradeSettings(updates: any) {
    return this.safeExecute(async () => {
      Object.assign(this.config, updates);
      const settings = await this.settingsModel.findOneAndUpdate(
        {},
        updates,
        { upsert: true, new: true },
      );
      return new CustomResponse(200, 'Trade settings updated', settings);
    });
  }

  async getOpenTrades() {
    return this.safeExecute(async () => {
      const data = await this.tradeModel
        .find({ status: 'open' })
        .populate('userId', 'email');
      return new CustomResponse(200, 'Open trades fetched', data);
    });
  }

  async forceCloseTrades(tradeId?: string) {
    return this.safeExecute(async () => {
      const filter = tradeId
        ? { _id: tradeId, status: 'open' }
        : { status: 'open' };

      const trades = await this.tradeModel.find(filter);

      for (const trade of trades) {
        const closePrice = await this.getCurrentPrice(trade.asset);

        trade.status = 'closed';
        trade.result = 'forced_close';
        trade.closePrice = closePrice;
        trade.payout = 0;
        await trade.save();

        const user = await this.userModel.findById(trade.userId);
        if (user) {
          const balanceType =
            trade.type === 'demo' ? 'demoBalance' : 'realBalance';
          user[balanceType] += trade.amount;
          await user.save();
        }
      }

      return new CustomResponse(
        200,
        `Force closed ${trades.length} trades`,
        trades,
      );
    });
  }

  async getHistory(filter: any) {
    return this.safeExecute(async () => {
      const data = await this.tradeModel.find(filter).sort({ createdAt: -1 });
      return new CustomResponse(200, 'Trade history fetched', data);
    });
  }

  async getClosedTrades() {
    return this.safeExecute(async () => {
      const data = await this.tradeModel.find({ status: 'closed' });
      return new CustomResponse(200, 'Closed trades fetched', data);
    });
  }

  async updateAsset(assetId: string, updates: any) {
    return this.safeExecute(async () => {
      const asset = await this.assetModel.findByIdAndUpdate(
        assetId,
        updates,
        { new: true },
      );
      return new CustomResponse(200, 'Asset updated', asset);
    });
  }

  async updateConfig(newConfig: any) {
    return this.safeExecute(async () => {
      Object.assign(this.config, newConfig);
      return new CustomResponse(200, 'Trade config updated', this.config);
    });
  }

  async reverseTrade(userId: string, tradeId: string) {
    return this.safeExecute(async () => {
      const trade = await this.tradeModel.findById(tradeId);
      if (!trade) throw new NotFoundException('Trade not found');
      if (trade.userId.toString() !== userId)
        throw new ForbiddenException('Not your trade');
      if (trade.status !== 'open')
        throw new BadRequestException('Trade already closed');

      const currentPrice = await this.getCurrentPrice(trade.asset);
      const newDirection = trade.direction === 'up' ? 'down' : 'up';

      const win =
        (newDirection === 'up' && currentPrice > trade.openPrice) ||
        (newDirection === 'down' && currentPrice < trade.openPrice);

      const payout = win
        ? trade.amount * (this.config.payoutPercentage / 100)
        : 0;

      const user = await this.userModel.findById(userId);
      if (!user) throw new NotFoundException('User not found');
      const balanceType =
        trade.type === 'demo' ? 'demoBalance' : 'realBalance';
      user[balanceType] += trade.amount + payout;
      await user.save();

      trade.status = 'closed';
      trade.direction = newDirection;
      trade.closePrice = currentPrice;
      trade.result = win ? 'win' : 'loss';
      trade.payout = payout;
      await trade.save();

      return new CustomResponse(200, 'Trade reversed and closed', trade);
    });
  }

  async cancelTrade(userId: string, tradeId: string) {
    return this.safeExecute(async () => {
      const trade = await this.tradeModel.findById(tradeId);
      if (!trade) throw new NotFoundException('Trade not found');
      if (trade.userId.toString() !== userId)
        throw new ForbiddenException('Not your trade');

      const user = await this.userModel.findById(userId);
      if (!user) throw new NotFoundException('User not found');
      const balanceType =
        trade.type === 'demo' ? 'demoBalance' : 'realBalance';

      user[balanceType] += trade.amount;
      await user.save();

      trade.status = 'cancelled';
      trade.result = 'cancelled';
      await trade.save();

      return new CustomResponse(200, 'Trade cancelled', trade);
    });
  }

  async getAllCurrencies() {
    return this.safeExecute(async () => {
      const data = await this.assetModel.find().sort({ symbol: 1 });
      return new CustomResponse(200, 'All currencies fetched', data);
    });
  }

  async getEnabledCurrencies() {
    return this.safeExecute(async () => {
      const data = await this.assetModel
        .find({ enabled: true })
        .sort({ symbol: 1 });
      return new CustomResponse(200, 'Enabled currencies fetched', data);
    });
  }

  async getCurrency(symbol: string) {
    return this.safeExecute(async () => {
      const currency = await this.assetModel.findOne({
        symbol: symbol.toUpperCase(),
      });
      if (!currency)
        throw new NotFoundException(`Currency ${symbol} not found`);
      return new CustomResponse(200, 'Currency fetched', currency);
    });
  }

  async createCurrency(dto: any) {
    return this.safeExecute(async () => {
      const exists = await this.assetModel.findOne({
        symbol: dto.symbol.toUpperCase(),
      });
      if (exists)
        throw new BadRequestException(
          `Currency ${dto.symbol} already exists`,
        );

      const currency = await this.assetModel.create({
        ...dto,
        symbol: dto.symbol.toUpperCase(),
        updatedBy: 'admin_id',
      });

      return new CustomResponse(201, 'Currency created', currency);
    });
  }

  async updateCurrency(symbol: string, updates: any) {
    return this.safeExecute(async () => {
      const currency = await this.assetModel.findOneAndUpdate(
        { symbol: symbol.toUpperCase() },
        { ...updates, updatedAt: new Date() },
        { new: true },
      );
      if (!currency)
        throw new NotFoundException(`Currency ${symbol} not found`);
      return new CustomResponse(200, 'Currency updated', currency);
    });
  }

  async toggleCurrency(symbol: string, enabled: boolean) {
    return this.updateCurrency(symbol, { enabled });
  }

  async deleteCurrency(symbol: string) {
    return this.safeExecute(async () => {
      const result = await this.assetModel.deleteOne({
        symbol: symbol.toUpperCase(),
      });
      return new CustomResponse(200, 'Currency deleted', result);
    });
  }

  // ===================== PRICE =====================
  private async getCurrentPrice(asset: string): Promise<number> {
    const map = {
      BTC: 'bitcoin',
      ETH: 'ethereum',
      BNB: 'binancecoin',
      SOL: 'solana',
      XRP: 'ripple',
      ADA: 'cardano',
      DOGE: 'dogecoin',
    };

    try {
      const id = map[asset];
      if (!id) return 60000 + Math.random() * 20000;

      const res = await axios.get<PriceResponse>(
        `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      );

      return res.data[id].usd;
    } catch {
      return 60000 + Math.random() * 20000;
    }
  }
}
