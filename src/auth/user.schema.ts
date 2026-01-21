import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ unique: true, required: true }) email: string;
  @Prop({ required: true }) password: string;
  @Prop() googleId?: string;
  @Prop({ unique: true }) referralCode: string;
  @Prop() parentReferral?: string; 
  @Prop({ type: [String], default: [] }) referrals: string[];
  @Prop({ default: 0 }) realBalance: number;
  @Prop({ default: 0 }) bonusBalance: number;
  @Prop({ default: 10000 }) demoBalance: number; 
  @Prop({ default: 'demo' }) activeMode: 'demo' | 'real'; 
  @Prop({ default: 'basic' }) tier: 'basic' | 'silver' | 'gold' | 'platinum';
  @Prop({ default: 'pending', enum: ['pending', 'approved', 'rejected'] }) kycStatus: string;
  @Prop() kycDocument?: string;
  @Prop({ default: 'user', enum: ['user', 'admin', 'superadmin','affiliate'] }) role: string;
  @Prop() twoFactorSecret?: string;
  @Prop({ default: false }) twoFactorEnabled: boolean;
  @Prop({ default: true }) withdrawalEnabled: boolean;
  @Prop({ default: false }) accountBlocked: boolean;
  @Prop({ default: false }) isInfluencer: boolean;
  @Prop() socialMediaLinks?: string;
  @Prop() audienceDetails?: string;
  @Prop({ default: false }) isLeader: boolean;
  @Prop({ type: [String], default: [] }) followers: string[]; 
  @Prop({ type: [String], default: [] }) followedLeaders: string[]; 
  @Prop({ default: 0 }) referralClicks: number = 0;
  @Prop({ default: 0 }) referralRegistrations: number = 0;
  @Prop({ default: 0 }) referralDeposits: number = 0;
  @Prop({ default: 0 }) referralDepositAmount: number = 0;
  @Prop({ default: 0 }) totalReferralEarnings: number = 0;
  @Prop({ default: 20 }) commissionRate: number = 20; 
  @Prop({ type: [String], default: [] }) subAffiliates: string[];
  @Prop() name?: string;
  @Prop() country?: string;
  @Prop() city?: string;
  @Prop() phone?: string;
  @Prop() whatsapp?: string;
  @Prop() telegramId?: string;
  @Prop() link?: string;
  @Prop() description?: string;
  @Prop() resetPasswordToken?: string;
  @Prop() resetPasswordExpiry?: Date;
  @Prop() avatarPath?: string;
  @Prop() phoneVerified?: Boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);