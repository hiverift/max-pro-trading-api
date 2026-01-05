import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  // Registration/Login
  @Prop({ unique: true, required: true }) email: string;
  @Prop({ required: true }) password: string;
  @Prop() googleId?: string; // Social login

  // Referral
  @Prop({ unique: true }) referralCode: string;
  @Prop() parentReferral?: string; // Kon ne refer kiya
  @Prop({ type: [String], default: [] }) referrals: string[]; // Direct referrals

  // Balances (User Dashboard)
  @Prop({ default: 0 }) realBalance: number;
  @Prop({ default: 0 }) bonusBalance: number;
  @Prop({ default: 10000 }) demoBalance: number; // Free practice
  @Prop({ default: 'demo' }) activeMode: 'demo' | 'real'; // Current trading mode

  // Tier / Rank Level
  @Prop({ default: 'basic' }) tier: 'basic' | 'silver' | 'gold' | 'platinum';

  // KYC (Wallet → Withdraw)
  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'] }) kycStatus: string;
  @Prop() kycDocument?: string; // Uploaded file path

  // Role & Security
  @Prop({ default: 'user', enum: ['user', 'admin', 'superadmin'] }) role: string;
  @Prop() twoFactorSecret?: string;
  @Prop({ default: false }) twoFactorEnabled: boolean;

  // Withdrawal Control
  @Prop({ default: true }) withdrawalEnabled: boolean;
  @Prop({ default: false }) accountBlocked: boolean;

  // Influencer Fields
  @Prop({ default: false }) isInfluencer: boolean;
  @Prop() socialMediaLinks?: string; // JSON string ya array
  @Prop() audienceDetails?: string;

  // Copy Trading
  @Prop({ default: false }) isLeader: boolean;
  @Prop({ type: [String], default: [] }) followers: string[]; // Jo follow kar rahe
  @Prop({ type: [String], default: [] }) followedLeaders: string[]; // Jinhe follow kar raha

  // Affiliate / Referral Earnings Tracking
  @Prop({ default: 0 }) referralClicks: number = 0;
  @Prop({ default: 0 }) referralRegistrations: number = 0;
  @Prop({ default: 0 }) referralDeposits: number = 0;
  @Prop({ default: 0 }) referralDepositAmount: number = 0;
  @Prop({ default: 0 }) totalReferralEarnings: number = 0;
  @Prop({ default: 20 }) commissionRate: number = 20; // Default 20%

  // Sub-Affiliate
  @Prop({ type: [String], default: [] }) subAffiliates: string[];

  // Profile Fields (from your screenshots)
  @Prop() name?: string;
  @Prop() country?: string;
  @Prop() whatsapp?: string;
  @Prop() telegramId?: string;
  @Prop() link?: string; // Personal link
  @Prop() description?: string;

  // Forgot Password
  @Prop() resetPasswordToken?: string;
  @Prop() resetPasswordExpiry?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);