import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsPhoneNumber, IsString, MinLength, Matches, IsNotEmpty } from 'class-validator';
import { UserRole, LanguageType } from 'src/common/enum/index.enum';
import { Transform } from 'class-transformer';

export class UpdateClientDto extends PartialType(CreateClientDto) {
    @ApiPropertyOptional({ example: 'Ali Valiyev' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    fullName?: string;

    @ApiPropertyOptional({
        example: 'ali_123',
        description: 'Kamida 3 belgi. Faqat harf, raqam va _. Harf bilan boshlanishi va tugashi shart.',
    })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    @Matches(/^[a-zA-Z][a-zA-Z0-9_]+[a-zA-Z0-9]$/, {
        message: 'username kamida 3 belgi, harf bilan boshlansin, harf/raqam bilan tugasin',
    })
    @MinLength(3)
    username?: string;

    @ApiPropertyOptional({ example: '+998901234567' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsPhoneNumber('UZ')
    phoneNumber?: string;

    @ApiPropertyOptional({ example: 'Password123' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @ApiPropertyOptional({ example: LanguageType.UZ, enum: LanguageType })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsEnum(LanguageType)
    language?: LanguageType;

    @ApiPropertyOptional({ example: '/uploads/client/photo.png' })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsString()
    photoPath?: string | null;

    @ApiPropertyOptional({ example: UserRole.CLIENT, enum: UserRole })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: true })
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;

    @ApiPropertyOptional({ type: 'string', format: 'binary' })
    @IsOptional()
    photo?: any;
}
