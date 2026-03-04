import { PartialType } from '@nestjs/swagger';
import { CreateMarketDto } from './create-market.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsPhoneNumber, IsString, MinLength, IsUUID, Matches, IsNotEmpty, IsEnum } from 'class-validator';
import { LanguageType } from 'src/common/enum/index.enum';
import { Transform } from 'class-transformer';

export class UpdateMarketDto extends PartialType(CreateMarketDto) {
    @ApiPropertyOptional({ example: 'Tech Market' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name?: string;

    @ApiPropertyOptional({ example: '+998901234567' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsPhoneNumber('UZ')
    phoneNumber?: string;

    @ApiPropertyOptional({
        example: 'tech_market',
        description: 'Kamida 3 belgi. Faqat harf, raqam va _. Harf bilan boshlanishi va tugashi shart.',
    })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    @Matches(/^[a-zA-Z][a-zA-Z0-9_]+[a-zA-Z0-9]$/, {
        message: 'username kamida 3 belgi, harf bilan boshlansin, harf/raqam bilan tugasin',
    })
    @MinLength(3)
    username?: string | null;

    @ApiPropertyOptional({ example: 'Password123' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({ example: '1f2c3d4e-5f6a-7b8c-9d0e-1a2b3c4d5e6f' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsUUID()
    adressId?: string | null;

    @ApiPropertyOptional({ example: LanguageType.UZ, enum: LanguageType })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsEnum(LanguageType)
    language?: LanguageType;

    @ApiPropertyOptional({ example: '/uploads/market/logo.png' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    photoPath?: string | null;

    @ApiPropertyOptional({ example: true })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

}
