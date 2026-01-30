import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Kyc extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: false })
  phone?: string; // Verified via OTP

  @Prop({ enum: ['pending', 'approved', 'rejected', 'expired'], default: 'pending' })
  status: string;

  @Prop()
  incomeBracket: string;

  @Prop()
  occupation: string;

  @Prop()
  panNumber: string;

  @Prop()
  panImagePath: string; // Uploaded file path

  @Prop()
  aadhaarNumber: string;

  @Prop()
  aadhaarImagePath: string;

  @Prop()
  selfiePath: string; // For Re-KYC

  @Prop({ default: false })
  isPep: boolean; // Politically Exposed Person

  @Prop()
  rejectionReason?: string;

  @Prop({ type: Date })
  expiresAt?: Date; // For Re-KYC expiry

  @Prop({ type: Date })
  createdAt?: Date; // When admin reviewed
}

export const KycSchema = SchemaFactory.createForClass(Kyc);