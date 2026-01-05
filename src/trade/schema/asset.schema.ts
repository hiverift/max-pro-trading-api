import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class Asset extends Document {
  @Prop() name: string;
  @Prop({ default: true }) enabled: boolean;
  @Prop({ default: true }) marketOpen: boolean;
  
}

export const AssetSchema = SchemaFactory.createForClass(Asset);