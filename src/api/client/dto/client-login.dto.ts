import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ClientLoginDto {
    @ApiProperty({ example: 'client' })
    @IsString()
    username: string;

    @ApiProperty({ example: 'Client123!' })
    @MinLength(6)
    password: string;
}
