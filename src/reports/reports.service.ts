// src/reports/reports.service.ts
// Reports Service – User, Finance, Trade Reports with Filters + CSV Export

import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../auth/user.schema';
import { Transaction } from 'src/wallet/schema/transaction.schema';
import { Trade } from 'src/trade/schema/trade.schema';
import { stringify } from 'csv-stringify/sync'; // npm install csv-stringify
import CustomResponse from 'src/provider/custom-response.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel('User') private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>,
    @InjectModel('Trade') private tradeModel: Model<Trade>,
  ) {}

  // Get User Reports (with filters: date, kycStatus, referral, balance >0, etc.)
  async getUserReports(query: any = {}) {
    const { startDate, endDate, kycStatus, referralSource, minBalance = 0, page = 1, limit = 20, exportCsv = false } = query;

    const filter: any = {};
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { $lte: new Date(endDate) };
    if (kycStatus) filter.kycStatus = kycStatus;
    if (referralSource) filter.parentReferral = referralSource;
    if (minBalance) filter.realBalance = { $gt: Number(minBalance) };

    const users = await this.userModel
      .find(filter)
      .select('email phone kycStatus realBalance bonusBalance createdAt parentReferral')
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    if (exportCsv) {
      const csvData = stringify(users.map(u => u.toObject()), { header: true });
      return { csvData }; // Send as file in controller
    }

    const total = await this.userModel.countDocuments(filter);

    return new CustomResponse(200, 'User reports fetched', {
      users,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  // Get Finance Reports (deposits, withdrawals, with filters: date, status, userId)
  async getFinanceReports(query: any = {}) {
    const { startDate, endDate, status, userId, page = 1, limit = 20, exportCsv = false } = query;

    const filter: any = {};
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { $lte: new Date(endDate) };
    if (status) filter.status = status;
    if (userId) filter.userId = userId;

    const transactions = await this.transactionModel
      .find(filter)
      .select('userId type amount status createdAt')
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    if (exportCsv) {
      const csvData = stringify(transactions.map(t => t.toObject()), { header: true });
      return { csvData };
    }

    const total = await this.transactionModel.countDocuments(filter);

    return new CustomResponse(200, 'Finance reports fetched', {
      transactions,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }

  // Get Trade Reports (win/loss, volume, userId, asset, date filters)
  async getTradeReports(query: any = {}) {
    const { startDate, endDate, result, asset, userId, page = 1, limit = 20, exportCsv = false } = query;

    const filter: any = {};
    if (startDate) filter.createdAt = { $gte: new Date(startDate) };
    if (endDate) filter.createdAt = { $lte: new Date(endDate) };
    if (result) filter.result = result;
    if (asset) filter.asset = asset;
    if (userId) filter.userId = userId;

    const trades = await this.tradeModel
      .find(filter)
      .select('userId asset amount direction result payout createdAt')
      .populate('userId', 'email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    if (exportCsv) {
      const csvData = stringify(trades.map(t => t.toObject()), { header: true });
      return { csvData };
    }

    const total = await this.tradeModel.countDocuments(filter);

    return new CustomResponse(200, 'Trade reports fetched', {
      trades,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  }
}