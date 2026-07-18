import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateAddressDto {
  @ApiProperty({ example: 'Home' })
  @IsString()
  @Length(1, 120)
  label: string;

  @ApiProperty()
  @IsString()
  @Length(1, 120)
  fullName: string;

  @ApiProperty({ example: '+919876543210' })
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone: string;

  @ApiProperty()
  @IsString()
  @Length(1, 255)
  line1: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 255)
  line2?: string;

  @ApiProperty()
  @IsString()
  @Length(1, 120)
  city: string;

  @ApiProperty()
  @IsString()
  @Length(1, 120)
  state: string;

  @ApiProperty()
  @IsString()
  @Length(1, 20)
  postalCode: string;

  @ApiPropertyOptional({ default: 'IN' })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
