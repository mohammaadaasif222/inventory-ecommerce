import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

/** Replace a product's hidden-theme list wholesale. */
export class SetThemeVisibilityDto {
  @ApiProperty({
    type: [String],
    description: 'Theme slugs this product is hidden in; visible elsewhere',
  })
  @IsArray()
  @IsString({ each: true })
  hiddenThemes: string[];
}

/** Bulk-set visibility of a category subtree's products for one theme. */
export class BulkThemeVisibilityDto {
  @ApiProperty({ example: 'universal' })
  @IsString()
  @Length(1, 80)
  themeSlug: string;

  @ApiProperty({ description: 'Category whose subtree the change applies to' })
  @IsUUID()
  categoryId: string;

  @ApiProperty()
  @IsBoolean()
  visible: boolean;
}
