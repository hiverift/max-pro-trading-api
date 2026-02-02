import { BadRequestException, Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User } from '../auth/user.schema';
import { WalletService } from '../wallet/wallet.service';
import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';
import { Transaction } from 'src/transaction/schema/transaction.schema';
import { Trade } from 'src/trade/schema/trade.schema';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @InjectModel('Trade') private tradeModel: Model<Trade>,
    @Inject(forwardRef(() => WalletService)) private walletService: WalletService,
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
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const objectId = new Types.ObjectId(userId);

    // Calculate total earnings from transactions
    const commissions = await this.transactionModel.aggregate([
      { $match: { userId: objectId, type: 'referral_commission', status: 'success' } },
      {
        $group: {
          _id: '$description', // Grouping by description to separate deposit vs trade if possible
          total: { $sum: '$amount' }
        }
      }
    ]);

    const earnings = {
      depositCommission: commissions
        .filter(c => c._id && /deposit/i.test(c._id))
        .reduce((sum, c) => sum + c.total, 0),
      tradeCommission: commissions
        .filter(c => c._id && /trade/i.test(c._id))
        .reduce((sum, c) => sum + c.total, 0),
      totalEarnings: user.totalReferralEarnings || 0,
      walletBalance: user.realBalance,
    };

    return new CustomResponse(200, 'Referral earnings fetched', earnings);
  }

  // ===================== WITHDRAW =====================
  async withdraw(userId: string, amount: number) {
    this.logger.log(`Referral withdrawal ${amount} for ${userId}`);
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

    let groupBy: any;
    let dateRange: Date;

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

    const normalizedCode = user.referralCode.toUpperCase();
    console.log(normalizedCode, 'normalizedcode')
    // Registrations (users who have this user's referral code as their parent)
    const registrations = await this.userModel.aggregate([
      {
        $match: {
          parentReferral: { $regex: new RegExp(`^${normalizedCode}$`, 'i') },
          createdAt: { $gte: dateRange }
        }
      },
      {
        $group: {
          _id: groupBy,
          registrations: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
    ]);

    // Get all referral IDs (as both string and ObjectId)
    const referredUsers = await this.userModel.find({
      parentReferral: { $regex: new RegExp(`^${normalizedCode}$`, 'i') }
    }).select('_id');
    console.log(`[DEBUG] Referred Users: ${JSON.stringify(referredUsers)}`);
    const referralIds = referredUsers.map(u => u._id.toString());
    const referralObjectIds = referredUsers.map(u => new Types.ObjectId(u._id.toString()));
    console.log(`[DEBUG] Referral IDs: ${referralIds.length}`);
    console.log(`[DEBUG] Referral Object IDs: ${referralObjectIds.length}`);
    // Deposits (sum of all successful deposits by referrals)
    const deposits = await this.transactionModel.aggregate([
      {
        $match: {
          type: 'deposit',
          status: 'success',
          userId: { $in: referralObjectIds },
          createdAt: { $gte: dateRange }
        }
      },
      {
        $group: {
          _id: groupBy,
          deposits: { $sum: 1 },
          depositSum: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
    ]);

    // Commission (earned by THIS user from referrals)
    const commission = await this.transactionModel.aggregate([
      { $match: { type: 'referral_commission', userId: new Types.ObjectId(userId), createdAt: { $gte: dateRange } } },
      {
        $group: {
          _id: groupBy,
          commission: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
    ]);

    // Withdrawals (by referred users)
    const withdrawals = await this.transactionModel.aggregate([
      { $match: { type: 'withdraw', status: 'success', userId: { $in: referralObjectIds }, createdAt: { $gte: dateRange } } },
      {
        $group: {
          _id: groupBy,
          withdrawals: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1, '_id.week': -1 } },
    ]);

    // Traders (active traders from referrals)
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

    // Clicks (accumulated total, show on most recent date)
    const clicksCount = user.referralClicks || 0;

    // Merge all data by date
    const allDates = new Set([
      ...registrations.map(r => JSON.stringify(r._id)),
      ...deposits.map(d => JSON.stringify(d._id)),
      ...commission.map(c => JSON.stringify(c._id)),
      ...withdrawals.map(w => JSON.stringify(w._id)),
      ...traders.map(t => JSON.stringify(t._id)),
    ]);

    // Sort dates to identify the most recent one for clicks
    const sortedDateStrings = Array.from(allDates).sort((a, b) => {
      const dbA = JSON.parse(a);
      const dbB = JSON.parse(b);
      return (dbB.year - dbA.year) || (dbB.month - dbA.month) || (dbB.day - dbA.day) || (dbB.week - dbA.week);
    });

    const statistics = sortedDateStrings.map((dateStr, index) => {
      const date = JSON.parse(dateStr);
      let formattedDate = `${date.year}`;
      if (date.month) formattedDate += `-${String(date.month).padStart(2, '0')}`;
      if (date.day) formattedDate += `-${String(date.day).padStart(2, '0')}`;
      if (date.week) formattedDate += `-W${date.week}`;

      return {
        date: formattedDate,
        clicks: index === 0 ? clicksCount : 0, // Show total clicks on the most recent date entry
        registrations: registrations.find(r => JSON.stringify(r._id) === dateStr)?.registrations || 0,
        deposits: deposits.find(d => JSON.stringify(d._id) === dateStr)?.deposits || 0,
        depositSum: deposits.find(d => JSON.stringify(d._id) === dateStr)?.depositSum || 0,
        commission: commission.find(c => JSON.stringify(c._id) === dateStr)?.commission || 0,
        withdrawals: withdrawals.find(w => JSON.stringify(w._id) === dateStr)?.withdrawals || 0,
        traders: traders.find(t => JSON.stringify(t._id) === dateStr)?.traders || 0,
        turnover: traders.find(t => JSON.stringify(t._id) === dateStr)?.turnover || 0,
      };
    });

    console.log(`[DEBUG] Returning ${statistics.length} statistics records`);
    return new CustomResponse(200, 'Affiliate statistics fetched', statistics);
  }

  // ===================== SUB AFFILIATE DATA =====================
  async getSubAffiliateData(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    const subs = await this.userModel.find({
      parentReferral: { $regex: new RegExp(`^${user.referralCode}$`, 'i') },
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
      referralCode: { $regex: new RegExp(`^${user.parentReferral}$`, 'i') },
    });

    if (parent) {
      parent.realBalance += commission;
      parent.totalReferralEarnings = (parent.totalReferralEarnings || 0) + commission;
      await parent.save();

      await this.transactionModel.create({
        userId: parent._id as any,
        type: 'referral_commission',
        amount: commission,
        status: 'success',
        transactionId: `REF_TRADE_${Date.now()}_${parent._id}`,
        description: `Trade commission from ${user.email}`,
      });

      this.logger.log(`Credited ${commission} trade commission to ${parent.email} from ${user.email}`);
    }
  }

  // ===================== CREDIT DEPOSIT COMMISSION ====================
  async creditDepositCommission(userId: string, depositAmount: number) {
    const commissionRate = 0.05;
    const commission = depositAmount * commissionRate;

    const user = await this.userModel.findById(userId);
    if (!user || !user.parentReferral) return;

    const parent = await this.userModel.findOne({
      referralCode: { $regex: new RegExp(`^${user.parentReferral}$`, 'i') },
    });

    if (parent) {
      parent.realBalance += commission;
      parent.totalReferralEarnings = (parent.totalReferralEarnings || 0) + commission;
      await parent.save();

      await this.transactionModel.create({
        userId: parent._id as any,
        type: 'referral_commission',
        amount: commission,
        status: 'success',
        transactionId: `REF_DEP_${Date.now()}_${parent._id}`,
        description: `Deposit commission from ${user.email}`,
      });

      this.logger.log(`Credited ${commission} deposit commission to ${parent.email} from ${user.email}'s deposit of ${depositAmount}`);
    }
  }
}
