import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Ticket extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  subject: string;

  @Prop({ required: true })
  description: string;

  @Prop({
    enum: ['deposit', 'withdrawal', 'kyc', 'trade', 'referral', 'account', 'platform', 'other'],
    required: true,
  })
  category: string;

  @Prop({ enum: ['open', 'in_progress', 'resolved', 'closed'], default: 'open' })
  status: string;

  @Prop({ enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @Prop()
  attachment?: string; // file path if uploaded

  @Prop({ type: [{ 
    message: String, 
    sender: { type: String, enum: ['user', 'admin'] }, 
    createdAt: Date 
  }], default: [] })
  replies: { message: string; sender: string; createdAt: Date }[];

  @Prop({ type: Date })
  closedAt?: Date;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);