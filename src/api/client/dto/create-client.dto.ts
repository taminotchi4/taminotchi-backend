import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsPhoneNumber, IsString, IsStrongPassword, MinLength } from 'class-validator';

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

    @ApiProperty({ example: 'StrongPass123!' })
    @IsStrongPassword()
    @MinLength(6)
    password: string;
}
