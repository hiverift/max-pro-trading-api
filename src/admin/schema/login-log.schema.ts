import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class LoginLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId; // null for failed attempts without user

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  ip: string;

  @Prop()
  country?: string;

  @Prop()
  city?: string;

  @Prop()
  userAgent: string;

  @Prop({ enum: ['success', 'failed'], required: true })
  status: string;

  @Prop()
  reason?: string; // e.g., "Invalid OTP", "Wrong password"

  @Prop()
  device?: string; // e.g., "Chrome on Windows"
}

export const LoginLogSchema = SchemaFactory.createForClass(LoginLog);