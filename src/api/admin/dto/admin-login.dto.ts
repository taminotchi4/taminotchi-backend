import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
    @ApiProperty({ example: 'admin1' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'Admin111!' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
