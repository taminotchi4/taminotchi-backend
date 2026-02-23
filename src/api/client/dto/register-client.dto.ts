import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { LanguageType } from 'src/common/enum/index.enum';

export class RegisterClientDto {
  @ApiProperty({ example: '+998901234567' })
  @IsPhoneNumber('UZ')
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'Ali Valiyev' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({
    example: 'ali_123',
    description:
      'Kamida 3 belgi. Faqat harf, raqam va _. Harf bilan boshlanishi va tugashi shart. _ boshi/oxirida bo\'lmaydi.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]+[a-zA-Z0-9]$/, {
    message:
      'username kamida 3 belgi, harf bilan boshlansin, harf/raqam bilan tugasin, faqat harf/raqam/_ ishlatilsin',
  })
  username?: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ example: LanguageType.UZ, enum: LanguageType })
  @IsOptional()
  @IsEnum(LanguageType)
  language?: LanguageType;
}
