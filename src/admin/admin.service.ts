// src/admin/admin.service.ts
// Full updated AdminService with all current endpoints + Milestone 1 complete (2FA OTP + RBAC)

import { Injectable, Logger, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { sendEmail } from 'src/util/mailerutil';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { User } from '../auth/user.schema';
import { Transaction } from 'src/wallet/schema/transaction.schema';
import { Trade } from 'src/trade/schema/trade.schema';
import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';
import * as speakeasy from 'speakeasy';
import axios from 'axios';
import { LoginLog } from './schema/login-log.schema';
import { AuditLog } from './schema/audit-log.schema';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @InjectModel('Trade') private tradeModel: Model<Trade>,
    @InjectModel(LoginLog.name) private loginLogModel: Model<LoginLog>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLog>,
    private jwtService: JwtService,
  ) {

  }

  // ────────────────────────────────────────────────
  // ADMIN AUTHENTICATION + 2FA (Milestone 1 Complete)
  // ────────────────────────────────────────────────

  async adminLogin(email: string, password: string, ip: string, userAgent: string) {
    console.log(`Admin login attempt for ${email}`);
    const admin = await this.userModel.findOne({ email, role: { $in: ['admin', 'superadmin'] } });
    if (!admin) {
      await this.logLoginAttempt(email, ip, userAgent, 'failed', 'Invalid email');
      throw new UnauthorizedException('Invalid credentials');
    }
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      await this.logLoginAttempt(email, ip, userAgent, 'failed', 'Invalid password', admin.id);
      throw new UnauthorizedException('Invalid credentials');
    }
    // Generate 6-digit OTP
    if (!admin.twoFactorSecret) {
      const secret = speakeasy.generateSecret({ length: 20 });
      admin.twoFactorSecret = secret.base32;
      await admin.save();
    }

    // Generate OTP using secret
    const otp = speakeasy.totp({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
    });
    // Send OTP to admin email
    await sendEmail(
      email,
      'Your 2FA OTP for Admin Login',
      `Your OTP: <strong>${otp}</strong></h2><p>Expires in 5 minutes`,
    );

    console.log(`2FA OTP sent to ${email}: ${otp}`); // Remove in production

    return new CustomResponse(200, 'OTP sent to admin email. Verify to login.', { email });
  }

  async verifyAdmin2FA(email: string, otp: string, ip: string, userAgent: string) {
    const admin = await this.userModel.findOne({ email, role: { $in: ['admin', 'superadmin'] } });
    if (!admin) throw new UnauthorizedException('Invalid request');
    console.log(`Verifying OTP for ${admin.twoFactorSecret} : ${email}: ${otp}`);
    // For demo: accept OTP from console (replace with real OTP storage/verification)
    // In production: store OTP in DB with expiry & verify here
    const isValid = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: otp,
      window: 2, // allow 30s before/after
    });

    if (!isValid) {
      await this.logLoginAttempt(email, ip, userAgent, 'failed', 'Invalid OTP', admin.id);
      throw new BadRequestException('Invalid or expired OTP');
    }
    const payload = { sub: admin._id, email: admin.email, role: admin.role || 'admin' };
    const token = this.jwtService.sign(payload);

    admin.lastLogin = new Date();
    await admin.save();

    return new CustomResponse(200, 'Admin login successful', {
      access_token: token,
      role: admin.role,
    });
  }

  // ────────────────────────────────────────────────
  // EXISTING ADMIN FEATURES (Already Good – No Change Needed)
  // ────────────────────────────────────────────────

  async getDashboard() {
    this.logger.log('Fetching admin dashboard');

    const totalUsers = await this.userModel.countDocuments();
    const activeTraders = await this.userModel.countDocuments({ realBalance: { $gt: 0 } });

    const totalDeposits = await this.transactionModel.aggregate([
      { $match: { type: 'deposit', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalWithdrawals = await this.transactionModel.aggregate([
      { $match: { type: 'withdraw', status: 'success' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const pendingKyc = await this.userModel.countDocuments({ kycStatus: 'pending' });

    return new CustomResponse(200, 'Admin dashboard fetched', {
      userMetrics: { totalUsers, activeTraders },
      financialMetrics: {
        totalDeposits: totalDeposits[0]?.total || 0,
        totalWithdrawals: totalWithdrawals[0]?.total || 0,
      },
      compliance: { pendingKyc },
    });
  }



  async getKycPending() {
    const users = await this.userModel.find({ kycStatus: 'pending' });
    return new CustomResponse(200, 'Pending KYC users fetched', users);
  }

  async approveKyc(userId: string) {
    const user = await this.userModel.findByIdAndUpdate(userId, { kycStatus: 'approved' }, { new: true });
    if (!user) throw new NotFoundException('User not found');
    return new CustomResponse(200, 'KYC approved', { userId });
  }

  async getDeposits() {
    const deposits = await this.transactionModel.find({ type: 'deposit' }).sort({ createdAt: -1 });
    return new CustomResponse(200, 'Deposits fetched', deposits);
  }

  async approveDeposit(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.status !== 'pending') throw new BadRequestException('Transaction already processed');

    tx.status = 'success';
    await tx.save();

    const user = await this.userModel.findById(tx.userId);
    if (!user) throw new NotFoundException('User not found');
    user.realBalance += tx.amount;
    await user.save();

    return new CustomResponse(200, 'Deposit approved');
  }

  async getWithdrawals() {
    const withdrawals = await this.transactionModel.find({ type: 'withdraw', status: 'pending' }).sort({ createdAt: -1 });
    return new CustomResponse(200, 'Pending withdrawals fetched', withdrawals);
  }

  async approveWithdrawal(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.status !== 'pending') throw new BadRequestException('Transaction already processed');

    tx.status = 'success';
    await tx.save();

    return new CustomResponse(200, 'Withdrawal approved');
  }

  async rejectWithdrawal(txId: string) {
    const tx = await this.transactionModel.findById(txId);
    if (!tx) throw new NotFoundException('Transaction not found');

    if (tx.status !== 'pending') throw new BadRequestException('Transaction already processed');

    tx.status = 'rejected';
    await tx.save();

    const user = await this.userModel.findById(tx.userId);
    if (!user) throw new NotFoundException('User not found');
    user.realBalance += Math.abs(tx.amount); // Refund
    await user.save();

    return new CustomResponse(200, 'Withdrawal rejected');
  }

  async freezeWallet(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.isWalletFrozen = true; // Add this field in User schema if not present
    await user.save();

    return new CustomResponse(200, 'Wallet frozen');
  }

  async approveLeader(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.isLeader = true;
    await user.save();

    return new CustomResponse(200, 'Leader approved');
  }

  async getHighLossAlerts(threshold = -1000) {
    const aggregates = await this.tradeModel.aggregate([
      { $group: { _id: '$userId', totalPayout: { $sum: '$payout' } } },
      { $match: { totalPayout: { $lt: threshold } } },
    ]);

    return new CustomResponse(200, 'High loss alerts fetched', aggregates);
  }

  async getApiDowntimeAlerts() {
    // Stub – in real: integrate monitoring (Prometheus, UptimeRobot, etc.)
    return new CustomResponse(200, 'API downtime status', { downtime: false });
  }

  async deleteUser(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    await this.tradeModel.deleteMany({ userId });
    await this.transactionModel.deleteMany({ userId });

    if (user.parentReferral) {
      await this.userModel.updateOne(
        { referralCode: user.parentReferral },
        { $pull: { referrals: user._id } },
      );
    }

    await user.deleteOne();

    return new CustomResponse(200, 'User and related data deleted');
  }

  async getUsers(query: any) {
    const { email, phone, userId, kycStatus, accountStatus, referralSource, page = 1, limit = 20 } = query;

    const filter: any = {};
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (phone) filter.phone = { $regex: phone, $options: 'i' };
    if (userId) filter._id = userId;
    if (kycStatus) filter.kycStatus = kycStatus;
    if (accountStatus === 'blocked') filter.isBlocked = true;
    if (accountStatus === 'active') filter.isBlocked = false;
    if (referralSource) filter.parentReferral = referralSource;

    const users = await this.userModel
      .find(filter)
      .select('email phone kycStatus isBlocked realBalance bonusBalance parentReferral createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await this.userModel.countDocuments(filter);

    return new CustomResponse(200, 'Users fetched', {
      users,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  async getUserProfile(userId: string) {
    const user = await this.userModel
      .findById(userId)
      .select('-password -twoFactorSecret')
      .populate('parentReferral', 'email username');

    if (!user) throw new NotFoundException('User not found');

    const transactions = await this.transactionModel.find({ userId }).sort({ createdAt: -1 }).limit(10);
    const trades = await this.tradeModel.find({ userId }).sort({ createdAt: -1 }).limit(10);

    return new CustomResponse(200, 'User profile fetched', {
      profile: user,
      recentTransactions: transactions,
      recentTrades: trades,
    });
  }

  async updateUser(userId: string, updates: any) {
    const allowedUpdates = ['email', 'phone', 'name', 'isBlocked', 'kycStatus'];
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedUpdates.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key];
        return obj;
      }, {});

    const user = await this.userModel.findByIdAndUpdate(userId, filteredUpdates, { new: true }).select('-password');
    if (!user) throw new NotFoundException('User not found');

    return new CustomResponse(200, 'User updated', user);
  }

  async blockUnblockUser(userId: string, block: boolean, reason?: any) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    user.isBlocked = block;
    user.blockReason = reason || (block ? 'Blocked by admin' : null);
    await user.save();

    return new CustomResponse(200, `User ${block ? 'blocked' : 'unblocked'}`, { userId, isBlocked: block });
  }

  async resetPassword(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const newPassword = Math.random().toString(36).slice(-8); // random 8 char password
    const hashed = await bcrypt.hash(newPassword, 10);

    user.password = hashed;
    await user.save();



    await sendEmail(
      user.email,
      'Your Password Has Been Reset',
      `Your new password is: <strong>${newPassword}</strong><br>Please change it immediately after login.`,
    );

    return new CustomResponse(200, 'Password reset and sent to user email', { userId: userId, newPassword: newPassword });
  }

  async adjustBalance(userId: string, amount: number, reason: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    if (!reason?.trim()) throw new BadRequestException('Reason required for balance adjustment');

    user.realBalance += amount;
    await user.save();

    // Audit log (optional – add Audit collection later)
    this.logger.log(`Admin adjusted balance for user ${userId}: ${amount} (${reason})`);

    return new CustomResponse(200, 'Balance adjusted', { userId, amount, newBalance: user.realBalance, reason });
  }

  async logLoginAttempt(email: string, ip: string, userAgent: string, status: 'success' | 'failed', reason?: string, userId?: string) {
    let geo = {};
    try {
      const res = await axios.get(`http://ip-api.com/json/${ip}`);
      console.log('Geo IP response:', res.data);
      geo = { country: "indiy" };
    } catch { }

    await this.loginLogModel.create({
      userId,
      email,
      ip,
      ...geo,
      userAgent,
      status,
      reason,
      device: userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
    });
  }

  // Get Login Logs (paginated + filters)
  async getLoginLogs(query: any = {}) {
    const { userId, email, ip, status, page = 1, limit = 20 } = query;

    const filter: any = {};
    if (userId) filter.userId = userId;
    if (email) filter.email = { $regex: email, $options: 'i' };
    if (ip) filter.ip = ip;
    if (status) filter.status = status;

    const logs = await this.loginLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await this.loginLogModel.countDocuments(filter);

    return new CustomResponse(200, 'Login logs fetched', {
      logs,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  }

  // Force Logout (single session or all)
  async forceLogout(
    userId: string,
    sessionId?: string,
    reason: string = 'Admin forced logout',
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // 🔥 Invalidate all existing JWTs
    user.forceLogoutAt = new Date();
    await user.save();

    await this.logAudit('force_logout', userId, { reason, sessionId });

    return new CustomResponse(
      200,
      'User logged out from all sessions',
      { userId },
    );
  }


  // Audit Log – Call this after every admin action
  async logAudit(action: string, targetId: string, changes: any, reason?: string, performedBy?: string, ip?: string) {
    await this.auditLogModel.create({
      performedBy: performedBy || 'system', // from req.user.sub in controller
      action,
      targetId,
      changes,
      reason,
      ip: ip || 'unknown',
    });
  }

  // Risk Rule: Lock account after 5 failed logins in 5 min
  async checkLoginLock(email: string, ip: string) {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const failedAttempts = await this.loginLogModel.countDocuments({
      email,
      status: 'failed',
      createdAt: { $gte: fiveMinAgo },
    });

    if (failedAttempts >= 5) {
      // Lock user (add isLocked field in User schema)
      await this.userModel.updateOne({ email }, { isLocked: true, lockUntil: new Date(Date.now() + 30 * 60 * 1000) });
      return true; // locked
    }
    return false;
  }

  
}