import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../auth/user.schema';
import { WalletService } from '../wallet/wallet.service';

import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private walletService: WalletService,
  ) {}

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
    // Dummy data – logic untouched
    return new CustomResponse(200, 'Affiliate statistics fetched', [
      {
        date: '2025-10-13',
        clicks: 12,
        registrations: 3,
        deposits: 2,
        depositSum: 1500,
        commission: 125,
        withdrawals: 0,
        traders: 1,
        turnover: 5400,
      },
    ]);
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
