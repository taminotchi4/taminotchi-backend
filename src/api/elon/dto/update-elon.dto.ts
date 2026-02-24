import { PartialType } from '@nestjs/swagger';
import { CreateElonDto } from './create-elon.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { ElonStatus } from 'src/common/enum/index.enum';

export class UpdateElonDto extends PartialType(CreateElonDto) {
    @ApiPropertyOptional({ example: 'Menga iPhone 13 kerak' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsString()
    text?: string;

    @ApiPropertyOptional({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @Transform(({ value }) => (value === '' || value === null || value === undefined ? undefined : value))
    @IsOptional()
    @IsUUID()
    categoryId?: string;

    @ApiPropertyOptional({ example: ElonStatus.NEGOTIATION, enum: ElonStatus })
    @IsOptional()
    @IsEnum(ElonStatus)
    status?: ElonStatus;
}
