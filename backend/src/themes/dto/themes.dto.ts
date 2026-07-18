import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

/** shadcn's bare-HSL token form: `"36 46% 52%"`. */
const HSL_TRIPLET = /^\d+(\.\d+)?\s+\d+(\.\d+)?%\s+\d+(\.\d+)?%$/;

/** One package as the frontend's generated registry describes it. */
export class DiscoveredThemeDto {
  @ApiProperty({ example: 'essence' })
  @IsString()
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case — it is also a directory name',
  })
  slug: string;

  @ApiProperty({ example: 'Essence' })
  @IsString()
  name: string;

  @ApiProperty({ example: '1.0.0' })
  @IsString()
  version: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ nullable: true, example: 'base' })
  @IsOptional()
  @IsString()
  extends?: string | null;
}

/**
 * Reconcile the database with the packages actually on disk.
 *
 * The frontend is the only thing that knows what is installed (it holds the
 * files), so it reports; the backend records. Anything absent from this list is
 * marked uninstalled rather than deleted, so a merchant's customisations
 * survive a package being temporarily removed.
 */
export class SyncThemesDto {
  @ApiProperty({ type: [DiscoveredThemeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscoveredThemeDto)
  themes: DiscoveredThemeDto[];
}

export class ThemeColorsDto {
  @ApiPropertyOptional({ example: { primary: '36 46% 52%' } })
  @IsOptional()
  @IsObject()
  light?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  dark?: Record<string, string>;
}

export class ThemeFontsDto {
  @ApiPropertyOptional({ example: 'Cormorant Garamond' })
  @IsOptional()
  @IsString()
  display?: string;

  @ApiPropertyOptional({ example: 'Inter' })
  @IsOptional()
  @IsString()
  body?: string;
}

/**
 * A customiser patch. Every field optional — the customiser saves one control
 * at a time and must not blank the rest.
 */
export class CustomizeThemeDto {
  @ApiPropertyOptional({ type: ThemeColorsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeColorsDto)
  colors?: ThemeColorsDto;

  @ApiPropertyOptional({ type: ThemeFontsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeFontsDto)
  fonts?: ThemeFontsDto;

  @ApiPropertyOptional({ example: '0.5rem' })
  @IsOptional()
  @Matches(/^[\d.]+(rem|px)$/, { message: 'radius must be a rem or px length' })
  radius?: string;

  @ApiPropertyOptional({ enum: ['classic', 'editorial', 'compact'] })
  @IsOptional()
  @IsIn(['classic', 'editorial', 'compact'])
  layoutPreset?: string;

  @ApiPropertyOptional({ enum: ['light', 'dark', 'system'] })
  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  appearance?: 'light' | 'dark' | 'system';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectionOrder?: string[];
}

/**
 * A draft customisation broadcast to preview windows without persisting.
 *
 * The customiser streams these on every control change; only Publish writes.
 * That is what makes preview a genuine draft rather than an edit of the live
 * storefront.
 */
export class PreviewThemeDto {
  @ApiProperty({ example: 'essence' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ type: CustomizeThemeDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomizeThemeDto)
  customizations?: CustomizeThemeDto;
}

export class ActivateThemeDto {
  @ApiPropertyOptional({
    description:
      'Carry the draft customisations from the preview session into the ' +
      'activation, so Publish applies exactly what was previewed.',
    type: CustomizeThemeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomizeThemeDto)
  customizations?: CustomizeThemeDto;
}

/** Validate the HSL form outside class-validator, where the keys are dynamic. */
export function invalidColorTokens(colors?: ThemeColorsDto): string[] {
  const bad: string[] = [];
  for (const mode of ['light', 'dark'] as const) {
    for (const [token, value] of Object.entries(colors?.[mode] ?? {})) {
      if (typeof value !== 'string' || !HSL_TRIPLET.test(value.trim())) {
        bad.push(`${mode}.${token}`);
      }
    }
  }
  return bad;
}

export class ThemeStateDto {
  @ApiProperty()
  @IsString()
  slug: string;

  @ApiProperty()
  @IsObject()
  customizations: Record<string, unknown>;

  @ApiProperty()
  @IsBoolean()
  canRollback: boolean;
}
