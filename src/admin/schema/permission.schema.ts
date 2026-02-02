import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Permission extends Document {
    @Prop({ required: true, unique: true })
    name: string; // e.g., "Manage Users"

    @Prop({ required: true, unique: true })
    slug: string; // e.g., "MANAGE_USERS"

    @Prop({ required: true })
    module: string; // e.g., "Users", "Finance", "KYC"

    @Prop()
    description?: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
