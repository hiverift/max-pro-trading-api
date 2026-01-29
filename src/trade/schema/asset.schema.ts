import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Asset extends Document {
  @Prop({ required: true, unique: true, uppercase: true })
  symbol: string;              // BTC, ETH, SOL, XRP, INRUSDT etc.

  @Prop({ required: true })
  name: string;                // Bitcoin, Ethereum, Indian Rupee

  @Prop({ default: true })
  enabled: boolean;            // Admin se disable kar sakte ho

  @Prop({ default: true })
  marketOpen: boolean;         // Market band hone pe trading stop

  @Prop({ default: 0 })
  price: number;               // Last fetched price (cache ke liye)

  @Prop()
  iconUrl?: string;            // Frontend ke liye logo/icon

  @Prop({ enum: ['crypto', 'fiat', 'index', 'commodity'], default: 'crypto' })
  type: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;  // Kaun admin ne last update kiya

  @Prop()
  updatedAt?: Date;
}

export const AssetSchema = SchemaFactory.createForClass(Asset);
