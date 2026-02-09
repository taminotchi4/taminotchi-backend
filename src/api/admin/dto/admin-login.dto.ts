import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
    @ApiProperty({ example: 'admin' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'Admin123!' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
