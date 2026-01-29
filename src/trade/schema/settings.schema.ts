import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TradeSettings extends Document {
  @Prop({ default: true })
  tradingEnabled: boolean;

  @Prop({ default: 85 })
  payoutPercentage: number; // 85% default

  @Prop({ default: 0.0001 })
  spread: number;

  @Prop({ default: 0 })
  executionDelaySeconds: number;

  @Prop({ default: true })
  demoModeEnabled: boolean;

  @Prop({ default: true })
  realModeEnabled: boolean;

  @Prop()
  updatedBy?: string; // admin ID
}

export const TradeSettingsSchema = SchemaFactory.createForClass(TradeSettings);