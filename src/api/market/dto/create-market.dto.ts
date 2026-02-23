import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsUUID,
    Matches,
    MinLength,
    IsStrongPassword,
} from 'class-validator';
import { LanguageType } from 'src/common/enum/index.enum';

export class CreateMarketDto {
    @ApiProperty({ example: 'Tech Market' })
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    name: string;

    @ApiProperty({ example: '+998901234567' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiPropertyOptional({
        example: 'tech_market',
        description:
            'Kamida 3 belgi. Faqat harf, raqam va _. Harf bilan boshlanishi va tugashi shart. _ boshi/oxirida bo\'lmaydi.',
    })
    @IsOptional()
    @IsString()
    @Matches(/^[a-zA-Z][a-zA-Z0-9_]+[a-zA-Z0-9]$/, {
        message:
            'username kamida 3 belgi, harf bilan boshlansin, harf/raqam bilan tugasin, faqat harf/raqam/_ ishlatilsin',
    })
    @MinLength(3)
    username?: string | null;

    @ApiProperty({ example: 'Password123' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({ example: '1f2c3d4e-5f6a-7b8c-9d0e-1a2b3c4d5e6f' })
    @Transform(({ value }) =>
        typeof value === 'string' && value.trim() === '' ? undefined : value,
    )
    @IsOptional()
    @IsUUID()
    adressId?: string | null;

    @ApiPropertyOptional({ example: LanguageType.UZ, enum: LanguageType })
    @IsOptional()
    @IsEnum(LanguageType)
    language?: LanguageType;

    @ApiPropertyOptional({ example: '/uploads/market/logo.png' })
    @IsOptional()
    @IsString()
    photoPath?: string | null;
}
