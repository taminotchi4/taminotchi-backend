import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class MarketLoginDto {
    @ApiProperty({ example: '+998901234567' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'Password123' })
    @IsString()
    @MinLength(6)
    password: string;
}
