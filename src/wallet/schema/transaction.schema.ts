import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop() userId: string;
  @Prop() amount: number;
  @Prop({ default: 'pending' }) status: string;
  @Prop() method: string;
  @Prop() expiry: Date;
  @Prop({ enum: ['deposit', 'withdraw', 'bonus_credit', 'bonus_usage', 'referral_bonus'] }) type: string;
  @Prop({ default: false }) isDemo: boolean; 
  @Prop() transactionId: string;
  @Prop() paymentLogs: string;
  @Prop({ default: 0 }) commissionDeducted: number;
  @Prop() riskFlag: boolean; 
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);