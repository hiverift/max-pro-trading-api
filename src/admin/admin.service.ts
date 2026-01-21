import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../auth/user.schema';
import { Transaction } from 'src/wallet/schema/transaction.schema';
import { Trade } from 'src/trade/schema/trade.schema';
import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @InjectModel('Trade') private tradeModel: Model<Trade>,
  ) { }

  async getDashboard() {
    this.logger.log('Fetching admin dashboard');

    const totalUsers = await this.userModel.countDocuments();
    const activeTraders = await this.userModel.countDocuments({
      realBalance: { $gt: 0 },
    });

    const totalDeposits = await this.transactionModel.aggregate([
      { $match: { type: 'deposit', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalWithdrawals = await this.transactionModel.aggregate([
      { $match: { type: 'withdraw', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const pendingKyc = await this.userModel.countDocuments({
      kycStatus: 'pending',
    });

    return new CustomResponse(200, 'Admin dashboard fetched', {
      userMetrics: {
        totalUsers,
        activeTraders,
      },
      financialMetrics: {
        totalDeposits: totalDeposits[0]?.total || 0,
        totalWithdrawals: totalWithdrawals[0]?.total || 0,
      },
      compliance: { pendingKyc },
    });
  }

  async getUsers(query: any) {
    const users = await this.userModel.find(query);
    return new CustomResponse(200, 'Users fetched', users);
  }

  async updateUser(userId: string, updates: any) {
    const user = await this.userModel.findByIdAndUpdate(userId, updates, {
      new: true,
    });
    return new CustomResponse(200, 'User updated', user);
  }

  async adjustBalance(userId: string, amount: number, reason: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');

    user.realBalance += amount;
    await user.save();

    return new CustomResponse(200, 'Balance adjusted', {
      amount,
      reason,
    });
  }

  async getKycPending() {
    const users = await this.userModel.find({ kycStatus: 'pending' });
    return new CustomResponse(200, 'Pending KYC users fetched', users);
  }

  async approveKyc(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      kycStatus: 'approved',
    });

    return new CustomResponse(200, 'KYC approved');
  }

  async getDeposits() {
    const deposits = await this.transactionModel.find({ type: 'deposit' });
    return new CustomResponse(200, 'Deposits fetched', deposits);
  }

  async approveDeposit(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new CustomError(404, 'Transaction not found');

    tx.status = 'success';
    await tx.save();

    const user = await this.userModel.findById(tx.userId);
    if (!user) throw new CustomError(404, 'User not found');

    user.realBalance += tx.amount;
    await user.save();

    return new CustomResponse(200, 'Deposit approved');
  }

  async getWithdrawals() {
    const withdrawals = await this.transactionModel.find({
      type: 'withdraw',
      status: 'pending',
    });

    return new CustomResponse(200, 'Withdrawals fetched', withdrawals);
  }

  async approveWithdrawal(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new CustomError(404, 'Transaction not found');

    tx.status = 'success';
    await tx.save();

    return new CustomResponse(200, 'Withdrawal approved');
  }

  async rejectWithdrawal(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new CustomError(404, 'Transaction not found');

    tx.status = 'failed';
    await tx.save();

    const user = await this.userModel.findById(tx.userId);
    if (!user) throw new CustomError(404, 'User not found');

    user.realBalance += Math.abs(tx.amount);
    await user.save();

    return new CustomResponse(200, 'Withdrawal rejected');
  }

  async freezeWallet(userId: string) {
    // Stub / logic unchanged
    return new CustomResponse(200, 'Wallet frozen');
  }

  async approveLeader(userId: string) {
    const user = await this.userModel.findById(userId);
    if (user) {
      user.isLeader = true;
      await user.save();
    }

    return new CustomResponse(200, 'Leader approved');
  }

  async getHighLossAlerts(threshold = -1000) {
    const aggregates = await this.tradeModel.aggregate([
      { $group: { _id: '$userId', totalPayout: { $sum: '$payout' } } },
      { $match: { totalPayout: { $lt: threshold } } },
    ]);
    if (aggregates.length === 0) {
      return new CustomResponse(204, 'No high loss alerts found', []);
    }
    return new CustomResponse(200, 'High loss alerts fetched', aggregates);
  }

  async getApiDowntimeAlerts() {
    // Stub
    return new CustomResponse(200, 'API downtime status', {
      downtime: false,
    });
  }

  async deleteUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Delete related data (trades, transactions, referrals, etc.)
    await this.tradeModel.deleteMany({ userId });
    await this.transactionModel.deleteMany({ userId });

    // Optional: Remove from referrals
    if (user.parentReferral) {
      await this.userModel.updateOne(
        { referralCode: user.parentReferral },
        { $pull: { referrals: user.referralCode } }
      );
    }

    await user.deleteOne();
    return new CustomResponse(200, 'User and all related data deleted successfully');
  }

  // async deleteKyc(userId: string) {
  //   const user = await this.userModel.findById(userId);
  //   if (!user) throw new NotFoundException('User not found');

  //   if (user.kycDocumentPath) {
  //     // Optional: Delete file from disk
  //     // fs.unlinkSync(user.kycDocumentPath);
  //   }

  //   user.kycStatus = 'pending';
  //   user.kycDocumentPath = null;
  //   await user.save();
  //   return new CustomResponse(200, 'KYC document deleted/rejected', { status: user.kycStatus });

  // }
}
