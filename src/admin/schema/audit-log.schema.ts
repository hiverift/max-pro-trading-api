import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AuditLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  performedBy: Types.ObjectId; // admin who did the action

  @Prop({ required: true })
  action: string; // "update_user", "approve_kyc", "adjust_balance", "force_logout"

  @Prop()
  targetId?: string; // userId, txId, kycId

  @Prop({ type: Object })
  changes?: { before?: any; after?: any }; // diff of changes

  @Prop()
  reason?: string;

  @Prop({ required: true })
  ip: string;

  @Prop()
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);