import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/user.schema';
import { Transaction } from 'src/wallet/schema/transaction.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
    tradeModel: any;
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
  ) {}

  async getDashboard() {
    this.logger.log('Fetching admin dashboard');
    const totalUsers = await this.userModel.countDocuments();
    const activeTraders = await this.userModel.countDocuments({ realBalance: { $gt: 0 } });
    const totalDeposits = await this.transactionModel.aggregate([{ $match: { type: 'deposit', status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const totalWithdrawals = await this.transactionModel.aggregate([{ $match: { type: 'withdraw', status: 'success' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]);
    const pendingKyc = await this.userModel.countDocuments({ kycStatus: 'pending' });
    // Add more metrics (open/closed trades, alerts)
    return { userMetrics: { totalUsers, activeTraders }, financialMetrics: { totalDeposits: totalDeposits[0]?.total || 0, totalWithdrawals: totalWithdrawals[0]?.total || 0 }, compliance: { pendingKyc } };
  }

  async getUsers(query: any) {
    // Search/filter by email, kycStatus, accountStatus, referralSource
    return this.userModel.find(query);
  }

  async updateUser(userId: string, updates: any) {
    const user = await this.userModel.findByIdAndUpdate(userId, updates, { new: true });
    return user;
  }

 async adjustBalance(userId: string, amount: number, reason: string) {
  const user = await this.userModel.findById(userId);
  if (!user) throw new Error('User not found');
  user.realBalance += amount;
  await user.save();
  // ...
}

  async getKycPending() {
    return this.userModel.find({ kycStatus: 'pending' });
  }

  async approveKyc(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, { kycStatus: 'approved' });
    return { message: 'KYC approved' };
  }

  async getDeposits() {
    return this.transactionModel.find({ type: 'deposit' });
  }

 async approveDeposit(txId: string) {
  const tx = await this.transactionModel.findById(txId);
  if (!tx) throw new Error('Transaction not found');
  tx.status = 'success';
  await tx.save();
  const user = await this.userModel.findById(tx.userId);
  if (!user) throw new Error('User not found');
  user.realBalance += tx.amount;
  await user.save();
  // ...
}







  async getWithdrawals() {
    return this.transactionModel.find({ type: 'withdraw', status: 'pending' });
  }

  async approveWithdrawal(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new Error('Transaction not found');
    tx.status = 'success';
    await tx.save();
    // Deduct commission if needed
    return { message: 'Withdrawal approved' };
  }

  async rejectWithdrawal(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new Error('Transaction not found');
    tx.status = 'failed';
    await tx.save();
    const user = await this.userModel.findById(tx.userId);
    if (!user) throw new Error('User not found');
    user.realBalance += Math.abs(tx.amount); // Refund
    await user.save();
    return { message: 'Withdrawal rejected' };
  }

  // Add wallet controls (enable/disable withdrawal, freeze)
  async freezeWallet(userId: string) {
    // Add field or logic
    return { message: 'Wallet frozen' };
  }

  // Updated src/admin/admin.service.ts (add approveLeader)
async approveLeader(userId: string) {
  const user = await this.userModel.findById(userId);
  if (user) {
    user.isLeader = true;
    await user.save();
  }
  return { message: 'Leader approved' };
}

async getHighLossAlerts(threshold = -1000) {
  const aggregates = await this.tradeModel.aggregate([
    { $group: { _id: '$userId', totalPayout: { $sum: '$payout' } } },
    { $match: { totalPayout: { $lt: threshold } } },
  ]);
  return aggregates;
}

async getApiDowntimeAlerts() {
  // Stub, check health
  return { downtime: false };
}
}