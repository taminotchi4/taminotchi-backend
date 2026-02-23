import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';
import { MessageType } from 'src/common/enum/index.enum';

export class SendGroupMessageDto {
    @ApiProperty({ example: 'uuid-of-group' })
    @IsUUID()
    @IsNotEmpty()
    groupId: string;

    @ApiProperty({ enum: MessageType, example: MessageType.TEXT })
    @IsEnum(MessageType)
    type: MessageType;

    @ApiPropertyOptional({ example: 'Salom hammaga!' })
    @IsOptional()
    @IsString()
    text?: string;

    @ApiPropertyOptional({ example: 'uploads/group/audio.mp3' })
    @IsOptional()
    @IsString()
    mediaPath?: string;

    @ApiPropertyOptional({ example: 'uuid-of-replied-message' })
    @IsOptional()
    @IsUUID()
    replyToId?: string;
}
