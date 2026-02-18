import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ElonStatus } from 'src/common/enum/index.enum';

export class UpdateElonStatusDto {
  @ApiProperty({ example: ElonStatus.NEGOTIATION, enum: ElonStatus })
  @IsEnum(ElonStatus)
  status: ElonStatus;
}
