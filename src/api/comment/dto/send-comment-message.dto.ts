import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { MessageType } from 'src/common/enum/index.enum';

export class SendCommentMessageDto {
    @IsUUID()
    commentId: string;

    @IsEnum(MessageType)
    type: MessageType;

    @IsOptional()
    @IsString()
    @MaxLength(4000)
    text?: string;

    @IsOptional()
    @IsString()
    mediaPath?: string;

    @IsOptional()
    @IsUUID()
    replyToId?: string;
}
