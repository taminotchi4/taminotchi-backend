import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsPhoneNumber, IsString, IsStrongPassword, MinLength } from 'class-validator';

export class CreateAdminDto {
    @ApiProperty({ example: 'superadmin' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: '+998932481224' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'Superadmin123!' })
    @IsStrongPassword()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'adham011905@gmail.com' })
    @IsEmail()
    @IsNotEmpty()
    email: string;
}
