import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    IsStrongPassword,
    MinLength,
} from 'class-validator';
import { LanguageType } from 'src/common/enum/index.enum';

export class CreateClientDto {
    @ApiProperty({ example: 'Ali Valiyev' })
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @ApiProperty({ example: 'ali' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: '+998901234567' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'Password123' })
    @IsString()
    @MinLength(6)
    password: string;

    @ApiPropertyOptional({ example: LanguageType.UZ, enum: LanguageType })
    @IsOptional()
    @IsEnum(LanguageType)
    language?: LanguageType;
}
