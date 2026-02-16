import { PartialType } from '@nestjs/swagger';
import { CreateMarketDto } from './create-market.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateMarketDto extends PartialType(CreateMarketDto) {
    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
