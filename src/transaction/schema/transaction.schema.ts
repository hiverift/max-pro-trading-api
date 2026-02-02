import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    enum: [
      'deposit',
      'withdraw',
      'bonus_credit',
      'bonus_expiry',
      'bonus_usage',
      'trade_win',
      'trade_loss',
      'referral_commission',
      'referral_bonus'
    ],
    required: true
  })
  type: string;

  @Prop({ required: true })
  amount: number;

  @Prop({
    enum: ['pending', 'success', 'failed', 'rejected', 'expired'],
    default: 'pending'
  })
  status: string;

  @Prop()
  method?: string;

  @Prop({ unique: true })
  transactionId: string;

  @Prop()
  description: string;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Object })
  paymentLogs?: any;

  @Prop({ default: false })
  isDemo?: boolean;

  @Prop({ default: 0 })
  commissionDeducted?: number;

  @Prop({ default: false })
  riskFlag?: boolean;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);