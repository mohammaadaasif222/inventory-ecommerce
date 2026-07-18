import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum ReviewSort {
  NEWEST = 'newest',
  RATING_DESC = 'rating_desc',
  RATING_ASC = 'rating_asc',
}

export class CreateReviewDto {
  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Exactly what I needed' })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 4000)
  body?: string;
}

export class UpdateReviewDto extends PartialType(CreateReviewDto) {}

export class ListReviewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({ enum: ReviewSort, default: ReviewSort.NEWEST })
  @IsOptional()
  @IsEnum(ReviewSort)
  sort?: ReviewSort = ReviewSort.NEWEST;
}
