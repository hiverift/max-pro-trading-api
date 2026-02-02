import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as cacheManager from 'cache-manager';
import { Cron } from '@nestjs/schedule';

import { User } from '../auth/user.schema';
import { Transaction } from 'src/transaction/schema/transaction.schema';
import { DepositDto } from './dtos/deposit.dto';
import { WithdrawDto } from './dtos/withdraw.dto';
import { Trade } from '../trade/schema/trade.schema';
import { ReferralService } from '../referral/referral.service';

import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';


@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private minWithdrawal = 100;
  private depositLimits = { min: 10, max: 1000000000 };

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @Inject(CACHE_MANAGER) private cacheManager: cacheManager.Cache,
    @Inject(forwardRef(() => ReferralService)) private referralService: ReferralService,
  ) { }

  // ===================== DEPOSIT =====================
  async deposit(userId: string, dto: DepositDto) {
    if (
      dto.amount < this.depositLimits.min ||
      dto.amount > this.depositLimits.max
    ) {
      throw new CustomError(400, 'Deposit limit violated');
    }

    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    const tx = new this.transactionModel({
      userId,
      type: 'deposit',
      amount: dto.amount,
      method: dto.method,
      status: 'pending',
    });

    tx.transactionId = 'TX' + Math.random().toString(36).substring(2);
    tx.paymentLogs = 'Gateway log stub';

    await tx.save();

    return new CustomResponse(200, 'Deposit pending', {
      txId: tx._id,
    });
  }

  // ===================== APPROVE DEPOSIT =====================
  async approveDeposit(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new CustomError(404, 'Transaction not found');
    if (tx.status !== 'pending')
      throw new CustomError(400, 'Invalid status');

    tx.status = 'success';
    await tx.save();

    const user = await this.userModel.findById(tx.userId);
    if (!user) throw new CustomError(404, 'User not found');

    user.realBalance += tx.amount;
    await user.save();

    // Credit commission to parent referral if exists
    if (user.parentReferral) {
      await this.referralService.creditDepositCommission(user._id.toString(), tx.amount);
    }

    await this.cacheManager.del(`dashboard_${tx.userId}`);

    return new CustomResponse(200, 'Deposit approved');
  }

  async withdraw(userId: string, dto: WithdrawDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');
    if (user.kycStatus !== 'approved')
      throw new CustomError(403, 'KYC required');
    if (!user.withdrawalEnabled)
      throw new CustomError(403, 'Withdrawal disabled');
    if (dto.amount < this.minWithdrawal)
      throw new CustomError(400, 'Below minimum withdrawal');
    if (user.realBalance < dto.amount)
      throw new CustomError(400, 'Insufficient balance');

    const commission = dto.amount * 0.05;
    const netAmount = dto.amount - commission;

    user.realBalance -= dto.amount;
    await user.save();

    const tx = new this.transactionModel({
      userId,
      type: 'withdraw',
      amount: -netAmount,
      method: dto.method,
      status: 'pending',
      commissionDeducted: commission,
    });

    tx.transactionId = 'TX' + Math.random().toString(36).substring(2);
    tx.riskFlag = dto.amount > 1000;

    await tx.save();
    await this.cacheManager.del(`dashboard_${userId}`);

    return new CustomResponse(200, 'Withdrawal requested', {
      txId: tx._id,
    });
  }


  @Cron('0 0 * * *')
  async checkBonusExpiry() {
    this.logger.log('Checking bonus expiries');

    const expired = await this.transactionModel.find({
      type: 'bonus_credit',
      expiresAt: { $lt: new Date() },
      status: 'success',
    });

    for (const tx of expired) {
      tx.status = 'expired';
      await tx.save();

      const user = await this.userModel.findById(tx.userId);
      if (user) {
        user.bonusBalance -= tx.amount;
        await user.save();
      }
    }
  }

  // ===================== HISTORY =====================
  async getHistory(userId: string) {
    const data = await this.transactionModel
      .find({ userId })
      .sort({ createdAt: -1 });

    return new CustomResponse(200, 'Transaction history fetched', data);
  }

  // ===================== COMBINED HISTORY =====================
  async getCombinedHistory(
    userId: string,
    options: {
      type?: 'deposit' | 'withdraw' | 'bonus' | 'referral_bonus';
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { type, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    let filter: any = { userId };
    if (type) filter.type = type;

    const transactions = await this.transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.transactionModel.countDocuments(filter);

    const history = transactions.map(tx => ({
      id: tx._id.toString(),
      type: tx.type,
      amount: tx.amount,
      status: tx.status,
      method: tx.method,
      date: (tx as any).createdAt,
      description: this.getTransactionDescription(tx),
    }));

    return new CustomResponse(200, 'Combined history fetched', {
      data: history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  // ===================== ADD BONUS =====================
  async addBonus(userId: string, amount: number, expiryDays: number) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    user.bonusBalance += amount;
    await user.save();

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + expiryDays);

    const tx = new this.transactionModel({
      userId,
      type: 'bonus_credit',
      amount,
      expiresAt: expiry,
      status: 'success',
    });

    const savedTx = await tx.save();
    await this.cacheManager.del(`dashboard_${userId}`);

    return new CustomResponse(200, 'Bonus added successfully', savedTx);
  }


  async getBalance(userId: string) {
    try {
      const user = await this.userModel.findById(userId);
      if (!user) throw new Error('User not found');
      const balance = {
        realBalance: user.realBalance,
        bonusBalance: user.bonusBalance,
        demoBalance: user.demoBalance,
        totalBalance: user.realBalance + user.bonusBalance,
      };
      return new CustomResponse(200, 'Balance fetched successfully', balance);
    } catch (error) {
      throw (error);
    }

  }

  private getTransactionDescription(tx: any) {
    switch (tx.type) {
      case 'deposit':
        return `Deposit via ${tx.method}`;
      case 'withdraw':
        return 'Withdrawal request';
      case 'bonus_credit':
        return 'Bonus credited';
      case 'bonus_usage':
        return 'Bonus used in trade';
      case 'referral_bonus':
        return 'Referral earnings';
      default:
        return tx.type;
    }
  }
}
