import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Admin extends Document {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string; // hashed

  @Prop({ enum: ['admin', 'superadmin'], default: 'admin' })
  role: string;

  @Prop({ default: false })
  is2FAEnabled: boolean;

  @Prop()
  twoFactorSecret?: string; // for authenticator app (optional)

  @Prop()
  lastLogin?: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);