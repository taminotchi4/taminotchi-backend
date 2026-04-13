import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateVerificationDto {
    @ApiProperty({ description: 'Tasdiqlash holati', default: true })
    @IsBoolean()
    isVerified: boolean;
}
