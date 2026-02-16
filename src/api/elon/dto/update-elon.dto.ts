import { PartialType } from '@nestjs/swagger';
import { CreateElonDto } from './create-elon.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ElonStatus } from 'src/common/enum/index.enum';

export class UpdateElonDto extends PartialType(CreateElonDto) {
    @ApiPropertyOptional({ example: ElonStatus.NEGOTIATION, enum: ElonStatus })
    @IsOptional()
    @IsEnum(ElonStatus)
    status?: ElonStatus;
}
