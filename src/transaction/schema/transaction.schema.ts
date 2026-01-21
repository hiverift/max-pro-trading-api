import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Transaction extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: ['deposit', 'withdraw', 'bonus_credit', 'bonus_expiry', 'trade_win', 'trade_loss', 'referral_commission'], required: true })
  type: string;

  @Prop({ required: true })
  amount: number; 

  @Prop({ enum: ['pending', 'success', 'failed', 'rejected', 'expired'], default: 'pending' })
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
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);