import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class ClientLoginDto {
    @ApiProperty({ example: '+998931234567' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'Client123!' })
    @IsString()
    @MinLength(6)
    password: string;
}
