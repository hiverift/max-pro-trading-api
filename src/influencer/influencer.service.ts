import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../auth/user.schema';
import { UpdateInfluencerDto } from './dtos/update-profile.dto';

import CustomResponse from 'src/provider/custom-response.service';
import CustomError from 'src/provider/customer-error.service';

@Injectable()
export class InfluencerService {
  private readonly logger = new Logger(InfluencerService.name);

  constructor(@InjectModel('User') private userModel: Model<User>) {}

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
}
