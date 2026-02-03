import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AdminLoginDto {
    @ApiProperty({ example: 'superadmin' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'Superadmin123!' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
