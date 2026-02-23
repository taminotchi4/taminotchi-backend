import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { UserRole } from 'src/common/enum/index.enum';

export class GetOrCreatePrivateChatDto {
    @ApiProperty({
        example: 'uuid-of-receiver',
        description: 'Xabar qabul qiluvchining IDsi',
    })
    @IsUUID()
    receiverId: string;

    @ApiProperty({
        enum: [UserRole.CLIENT, UserRole.MARKET],
        example: UserRole.MARKET,
        description: 'Xabar qabul qiluvchining roli (client yoki market)',
    })
    @IsEnum([UserRole.CLIENT, UserRole.MARKET])
    receiverRole: UserRole.CLIENT | UserRole.MARKET;
}
