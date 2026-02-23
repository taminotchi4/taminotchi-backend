import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateMessageDto {
    @ApiPropertyOptional({ example: 'Yangilangan xabar matni' })
    @IsString()
    @IsOptional()
    @MaxLength(4000)
    text: string;
}
