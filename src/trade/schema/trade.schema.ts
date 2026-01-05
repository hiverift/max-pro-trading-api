import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Updated src/trade/trade.schema.ts (add isCopy)
@Schema({ timestamps: true })
export class Trade extends Document {
  @Prop() userId: string;
  @Prop() asset: string;
  @Prop() amount: number;
  @Prop() direction: string;
  @Prop() type: string;
  @Prop({ default: 'open' }) status: string;
  @Prop() result: string;
  @Prop() payout: number;
  @Prop({ default: false }) isCopy: boolean; // New
  @Prop() currentPrice: number;
  @Prop() newPrice: number;
  @Prop() openPrice?: number;
  @Prop() closePrice?: number;
  @Prop() expiryTime?: Date;
  
}

export const TradeSchema = SchemaFactory.createForClass(Trade);

