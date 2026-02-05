import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, IsStrongPassword, MinLength } from 'class-validator';

export class CreateAdminDto {
    @ApiProperty({ example: 'admin' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: '+998932481234' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'Admin111!' })
    @IsStrongPassword()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'adham111@gmail.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
