import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type KbCategoryDocument = HydratedDocument<KbCategory>;

@Schema({ timestamps: true, collection: 'kb_categories' })
export class KbCategory {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true, index: true })
  slug: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const KbCategorySchema = SchemaFactory.createForClass(KbCategory);
