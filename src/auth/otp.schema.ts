// src/auth/otp.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Otp extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  code: string;

  @Prop({ required: true, enum: ['kyc_phone_verify', 'login', 'signup'] })
  type: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);