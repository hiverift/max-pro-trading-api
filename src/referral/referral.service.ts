import { Injectable, Logger,NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/user.schema';
import { WalletService } from '../wallet/wallet.service'; // For withdrawal

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private walletService: WalletService,
  ) {}

  async getCode(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return { referralCode: user.referralCode, link: `https://platform.com/signup?ref=${user.referralCode}` };
  }

  async getTree(userId: string) {
    this.logger.log(`Fetching referral tree for ${userId}`);
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const tree = await this.userModel.find({ parentReferral: user.referralCode }); // Basic level 1; recurse for deeper
    return { active: tree.filter(u => u.realBalance > 0), inactive: tree.filter(u => u.realBalance === 0) };
  }

  async getEarnings(userId: string) {
    // Stub: Aggregate from trades/commissions (e.g., first deposit bonus, trade commission, level income, KYC rewards)
    return { firstDepositBonus: 100, tradeCommission: 50, levelIncome: 20, kycRewards: 10 };
  }

  async withdraw(userId: string, amount: number) {
    // Assume earnings balance; transfer to real or process
    this.logger.log(`Referral withdrawal ${amount} for ${userId}`);
    return this.walletService.withdraw(userId, { amount, method: 'referral' });
  }

  async getAffiliateDashboard(userId: string) {
  const user = await this.userModel.findById(userId);
  if (!user) throw new NotFoundException();

  return {
    referralCode: user.referralCode,
    referralLink: `https://tradepro.com/signup?ref=${user.referralCode}`,
    registeredReferrals: user.referrals.length,
    walletBalance: user.realBalance + user.bonusBalance,
    portfolioValue: user.realBalance * 1.1, // dummy calculation
    commissionRate: user.commissionRate,
    totalCommissionsEarned: user.totalReferralEarnings,
  };
}

async getStatistics(userId: string, period: string) {
  // Dummy data for screenshot match – real mein DB se aggregate karo
  return [
    { date: '2025-10-13', clicks: 12, registrations: 3, deposits: 2, depositSum: 1500, commission: 125, withdrawals: 0, traders: 1, turnover: 5400 },
    // ... more rows
  ];
}

async getSubAffiliateData(userId: string) {
  const user = await this.userModel.findById(userId);
  if (!user) throw new NotFoundException('User not found');
  const subs = await this.userModel.find({ parentReferral: user.referralCode });
  return {
    subAffiliateLink: `https://tradepro.com/sub-affiliate-signup?ref=${user.referralCode}`,
    subAffiliates: subs.map(s => ({
      partnerId: s.referralCode,
      name: s.email.split('@')[0],
      email: s.email,
      totalAmount: s.realBalance,
      totalCommission: s.totalReferralEarnings || 0,
    })),
  };
}

async creditTradeCommission(userId: string, payout: number) {
  const commissionRate = 0.1; // 10% commission on profit
  const commission = payout * commissionRate;

  const user = await this.userModel.findById(userId);
  if (!user || !user.parentReferral) return;

  const parent = await this.userModel.findOne({ referralCode: user.parentReferral });
  if (parent) {
    parent.realBalance += commission;
    parent.totalReferralEarnings = (parent.totalReferralEarnings || 0) + commission;
    await parent.save();
  }
}
}