import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Role extends Document {
    @Prop({ required: true, unique: true })
    name: string; // e.g., "Compliance Officer"

    @Prop({ type: [{ type: Types.ObjectId, ref: 'Permission' }] })
    permissions: Types.ObjectId[];

    @Prop()
    description?: string;

    @Prop({ default: false })
    isDefault: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
