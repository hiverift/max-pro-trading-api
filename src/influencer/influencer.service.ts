import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { User } from '../auth/user.schema';
import { UpdateInfluencerDto } from './dtos/update-profile.dto';
import { Transaction } from 'src/transaction/schema/transaction.schema';
import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';

@Injectable()
export class InfluencerService {
  private readonly logger = new Logger(InfluencerService.name);

  constructor(@InjectModel('User') private userModel: Model<User>,
    @InjectModel('Transaction') private transactionModel: Model<Transaction>) { }

  async updateProfile(userId: string, dto: UpdateInfluencerDto) {
    this.logger.log(`Updating influencer profile for ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) throw new CustomError(404, 'User not found');
    if (!user.isInfluencer) throw new CustomError(403, 'Not an influencer');

    Object.assign(user, dto);
    user.isInfluencer = true;

    await user.save();

    return new CustomResponse(200, 'Profile updated');
  }

  async getDashboard(userId: string) {
    // Aggregates: clicks, registrations, deposits, conversion (stub)
    return new CustomResponse(200, 'Influencer dashboard fetched', {
      clicks: 100,
      registrations: 50,
      deposits: 20,
      conversionRate: '40%',
    });
  }

  async getCampaigns(userId: string) {
    // Stub promo codes
    return new CustomResponse(200, 'Campaigns fetched', {
      promoCodes: ['INFL123'],
    });
  }

  async getEarnings(userId: string) {
    // Commission summary, payout history (stub)
    return new CustomResponse(200, 'Earnings fetched', {
      commissionSummary: 500,
      payoutHistory: [
        { date: '2025-12-01', amount: 200 },
      ],
    });
  }

  async createPromoCode(userId: string, code: string) {
    // Stub, save in user or separate schema
    return new CustomResponse(201, 'Promo code created', {
      promoCode: code,
    });
  }

  async getPromoCodes(userId: string) {
    // Stub
    return new CustomResponse(200, 'Promo codes fetched', ['PROMO1']);
  }
  async getAnalytics(userId: string, startDate: string, endDate: string) {
    const user = await this.userModel.findById(userId);
    if (!user || !user.isInfluencer) {
      throw new ForbiddenException('Not an influencer account');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);

    // Referred users (registrations)
    const registrations = await this.userModel.find({
      parentReferral: user.referralCode,
      createdAt: { $gte: start, $lte: end },
    }).select('_id createdAt');

    // referredIds: ObjectId[] – direct from Mongoose
    const referredIds = registrations.map(r => r._id); // r._id is Types.ObjectId

    // Deposits – $in with ObjectId[] (type assertion to silence TS overload confusion)
    const deposits = await this.transactionModel.find({
      userId: { $in: referredIds } as any, // <--- Ye line type error ko bypass karti hai
      type: 'deposit',
      status: 'success',
      createdAt: { $gte: start, $lte: end },
    }).select('amount createdAt');

    // Visitors placeholder
    const visitorsCurrent = new Array<number>(daysDiff).fill(0);

    // Group by day helper
    const getDailyData = (items: any[], key: 'count' | 'amount') => {
      const daily = new Array<number>(daysDiff).fill(0);
      items.forEach(item => {
        const itemDate = new Date(item.createdAt);
        const dayIndex = Math.floor((itemDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < daysDiff) {
          daily[dayIndex] += key === 'amount' ? (item.amount || 1) : 1;
        }
      });
      return daily;
    };

    const currentRegistrations = getDailyData(registrations, 'count');
    const currentDeposits = getDailyData(deposits, 'amount');

    // Previous period
    const prevRegistrations = await this.userModel.find({
      parentReferral: user.referralCode,
      createdAt: { $gte: prevStart, $lte: prevEnd },
    }).select('_id createdAt');

    const prevDeposits = await this.transactionModel.find({
      userId: { $in: prevRegistrations.map(r => r._id) } as any, // <--- Ye line bhi fix
      type: 'deposit',
      status: 'success',
      createdAt: { $gte: prevStart, $lte: prevEnd },
    }).select('amount createdAt');

    const previousRegistrations = getDailyData(prevRegistrations, 'count');
    const previousDeposits = getDailyData(prevDeposits, 'amount');

    // Date labels
    const labels: string[] = [];
    for (let i = 0; i < daysDiff; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      labels.push(d.toISOString().split('T')[0]);
    }

    // Totals
    const calculateTotal = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

    return {
      dateRange: { start: startDate, end: endDate },
      labels,
      currentPeriod: {
        visitors: visitorsCurrent,
        registrations: currentRegistrations,
        deposits: currentDeposits,
      },
      previousPeriod: {
        visitors: new Array<number>(daysDiff).fill(0),
        registrations: previousRegistrations,
        deposits: previousDeposits,
      },
      totals: {
        current: {
          visitors: calculateTotal(visitorsCurrent),
          registrations: calculateTotal(currentRegistrations),
          deposits: calculateTotal(currentDeposits),
        },
        previous: {
          visitors: 0,
          registrations: calculateTotal(previousRegistrations),
          deposits: calculateTotal(previousDeposits),
        },
      },
    };
  }
}
