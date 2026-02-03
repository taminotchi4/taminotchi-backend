import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, MinLength } from 'class-validator';

export class MarketLoginDto {
    @ApiProperty({ example: '+998901234567' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'StrongPass123!' })
    @MinLength(6)
    password: string;
}
