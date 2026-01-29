import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Trade extends Document {
  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: String, required: true })
  asset: string;

  @Prop({ type: Number, required: true })
  amount: number;

  @Prop({ type: String, enum: ['up', 'down'], required: true })
  direction: string;

  @Prop({ type: String, enum: ['demo', 'real'], required: true })
  type: string;

  @Prop({ default: 'open' })
  status: string;

  @Prop({ enum: ['win', 'loss', 'forced_close', 'cancelled'] })
  result?: string;

  @Prop({ default: 0 })
  payout: number;

  @Prop({ default: false })
  isCopy: boolean;

  @Prop()
  openPrice: number;

  @Prop()
  closePrice?: number;

  @Prop()
  expiryTime?: Date;

  @Prop()
  copiedFrom?: string; 

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const TradeSchema = SchemaFactory.createForClass(Trade);