import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../auth/user.schema';
import { WalletService } from '../wallet/wallet.service';
import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';
import { Transaction } from 'src/wallet/schema/transaction.schema';
import { Trade } from 'src/trade/schema/trade.schema';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @InjectModel('Trade') private tradeModel: Model<Trade>, 
    private walletService: WalletService,
  ) { }

  // ===================== GET REFERRAL CODE =====================
  async getCode(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    return new CustomResponse(200, 'Referral code fetched', {
      referralCode: user.referralCode,
      link: `https://platform.com/signup?ref=${user.referralCode}`,
    });
  }

  // ===================== GET REFERRAL TREE =====================
  async getTree(userId: string) {
    this.logger.log(`Fetching referral tree for ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    const tree = await this.userModel.find({
      parentReferral: user.referralCode,
    });

    return new CustomResponse(200, 'Referral tree fetched', {
      active: tree.filter(u => u.realBalance > 0),
      inactive: tree.filter(u => u.realBalance === 0),
    });
  }


  async getReferralTree(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const level1 = await this.userModel.find({ parentReferral: user.referralCode });
    const level1Ids = level1.map(u => u._id);

    const level2 = await this.userModel.find({ parentReferral: { $in: level1.map(u => u.referralCode) } });
    const data = {
      user: { id: user._id, email: user.email, referralCode: user.referralCode },
      level1: level1.map(u => ({ id: u._id, email: u.email, referralCode: u.referralCode })),
      level2: level2.map(u => ({ id: u._id, email: u.email, referralCode: u.referralCode })),
      totalReferrals: level1.length + level2.length,
      totalEarnings: user.totalReferralEarnings || 0
    }
    return new CustomResponse(200, 'Full referral tree fetched', data)

  }


  // Admin: Get all referral logs
  async getAllReferralLogs() {
    return this.userModel.find().populate('referralCode', 'email').populate('parentReferral', 'email');
  }
  // ===================== GET EARNINGS =====================
  async getEarnings(userId: string) {
    // Stub / dummy values (logic untouched)
    return new CustomResponse(200, 'Referral earnings fetched', {
      firstDepositBonus: 100,
      tradeCommission: 50,
      levelIncome: 20,
      kycRewards: 10,
    });
  }

  // ===================== WITHDRAW =====================
  async withdraw(userId: string, amount: number) {
    this.logger.log(`Referral withdrawal ${amount} for ${userId}`);

    // WalletService already returns CustomResponse
    return this.walletService.withdraw(userId, {
      amount,
      method: 'referral',
    });
  }

  // ===================== AFFILIATE DASHBOARD =====================
  async getAffiliateDashboard(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    return new CustomResponse(200, 'Affiliate dashboard fetched', {
      referralCode: user.referralCode,
      referralLink: `https://tradepro.com/signup?ref=${user.referralCode}`,
      registeredReferrals: user.referrals.length,
      walletBalance: user.realBalance + user.bonusBalance,
      portfolioValue: user.realBalance * 1.1,
      commissionRate: user.commissionRate,
      totalCommissionsEarned: user.totalReferralEarnings,
    });
  }

// ===================== STATISTICS =====================
async getStatistics(userId: string, period: string) {
  const user = await this.userModel.findById(userId);
  if (!user) throw new NotFoundException('User not found');

  let groupBy;
  let dateRange;

  switch (period) {
    case 'daily':
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
      dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days
      break;
    case 'weekly':
      groupBy = { year: { $year: '$createdAt' }, week: { $week: '$createdAt' } };
      dateRange = new Date(Date.now() - 52 * 7 * 24 * 60 * 60 * 1000); // last year
      break;
    case 'monthly':
      groupBy = { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
      dateRange = new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000); // last year
      break;
    default:
      throw new BadRequestException('Invalid period');
  }

  // Get referrals (registrations)
  const registrations = await this.userModel.aggregate([
    { $match: { parentReferral: user.referralCode, createdAt: { $gte: dateRange } } },
    {
      $group: {
        _id: groupBy,
        registrations: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
  ]);
  
  // Get referrals' userIds
  const referralIds = (await this.userModel.find({ parentReferral: user.referralCode })).map(u => u._id);

  // Deposits (from referrals)
  const deposits = await this.transactionModel.aggregate([
    { $match: { type: 'deposit', status: 'success', userId: { $in: referralIds }, createdAt: { $gte: dateRange } } },
    {
      $group: {
        _id: groupBy,
        deposits: { $sum: 1 },
        depositSum: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
  ]);

  // Commission (user's referralEarnings – but since no separate model, use totalReferralEarnings or calculate from transactions)
  const commission = await this.transactionModel.aggregate([
    { $match: { type: 'referral_commission', userId, status: 'approved', createdAt: { $gte: dateRange } } },
    {
      $group: {
        _id: groupBy,
        commission: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
  ]);

  // Withdrawals (from referrals)
  const withdrawals = await this.transactionModel.aggregate([
    { $match: { type: 'withdraw', status: 'success', userId: { $in: referralIds }, createdAt: { $gte: dateRange } } },
    {
      $group: {
        _id: groupBy,
        withdrawals: { $sum: 1 },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
  ]);

  // Traders (active traders from referrals – trades by referrals)
  const traders = await this.tradeModel.aggregate([
    { $match: { userId: { $in: referralIds }, status: 'closed', createdAt: { $gte: dateRange } } },
    {
      $group: {
        _id: groupBy,
        traders: { $addToSet: '$userId' },
        turnover: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
    { $project: { traders: { $size: '$traders' }, turnover: 1 } },
  ]);

  // Clicks (dummy, assume referralClicks field in user)
  const clicks = await this.userModel.aggregate([
    { $match: { _id: userId, createdAt: { $gte: dateRange } } },
    {
      $group: {
        _id: groupBy,
        clicks: { $sum: '$referralClicks' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
  ]);

  // Merge all data by date
  const allDates = new Set([
    ...registrations.map(r => JSON.stringify(r._id)),
    ...deposits.map(d => JSON.stringify(d._id)),
    ...commission.map(c => JSON.stringify(c._id)),
    ...withdrawals.map(w => JSON.stringify(w._id)),
    ...traders.map(t => JSON.stringify(t._id)),
  ]);

  const statistics = Array.from(allDates).map(dateStr => {
    const date = JSON.parse(dateStr);
    return {
      date: `${date.year}-${date.month || date.week || ''}-${date.day || ''}`, // format date
      clicks: clicks.find(c => JSON.stringify(c._id) === dateStr)?.clicks || 0,
      registrations: registrations.find(r => JSON.stringify(r._id) === dateStr)?.registrations || 0,
      deposits: deposits.find(d => JSON.stringify(d._id) === dateStr)?.deposits || 0,
      depositSum: deposits.find(d => JSON.stringify(d._id) === dateStr)?.depositSum || 0,
      commission: commission.find(c => JSON.stringify(c._id) === dateStr)?.commission || 0,
      withdrawals: withdrawals.find(w => JSON.stringify(w._id) === dateStr)?.withdrawals || 0,
      traders: traders.find(t => JSON.stringify(t._id) === dateStr)?.traders || 0,
      turnover: traders.find(t => JSON.stringify(t._id) === dateStr)?.turnover || 0,
    };
  });

  return new CustomResponse(200, 'Affiliate statistics fetched', statistics);
}
  // ===================== SUB AFFILIATE DATA =====================
  async getSubAffiliateData(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    const subs = await this.userModel.find({
      parentReferral: user.referralCode,
    });

    return new CustomResponse(200, 'Sub affiliate data fetched', {
      subAffiliateLink: `https://tradepro.com/sub-affiliate-signup?ref=${user.referralCode}`,
      subAffiliates: subs.map(s => ({
        partnerId: s.referralCode,
        name: s.email.split('@')[0],
        email: s.email,
        totalAmount: s.realBalance,
        totalCommission: s.totalReferralEarnings || 0,
      })),
    });
  }

  // ===================== CREDIT TRADE COMMISSION ====================
  async creditTradeCommission(userId: string, payout: number) {
    const commissionRate = 0.1;
    const commission = payout * commissionRate;

    const user = await this.userModel.findById(userId);
    if (!user || !user.parentReferral) return;

    const parent = await this.userModel.findOne({
      referralCode: user.parentReferral,
    });

    if (parent) {
      parent.realBalance += commission;
      parent.totalReferralEarnings =
        (parent.totalReferralEarnings || 0) + commission;
      await parent.save();
    }
  }
}
