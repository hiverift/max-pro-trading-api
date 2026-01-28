import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ enum: ['info', 'success', 'warning', 'error'], default: 'info' })
  type: string;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  actionUrl?: string; // e.g., link to withdrawal page

  @Prop()
  template?: string; // e.g., "deposit_success"
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);