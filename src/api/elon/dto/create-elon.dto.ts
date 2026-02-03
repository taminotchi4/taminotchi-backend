import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsUUID,
} from 'class-validator';

export class CreateElonDto {
    @ApiProperty({ example: 'Menga iPhone 13 kerak' })
    @IsString()
    @IsNotEmpty()
    text: string;

    @ApiProperty({ example: 'b5b6f7d8-1111-2222-3333-444455556666' })
    @IsUUID()
    categoryId: string;

    @ApiProperty({ example: 'a1b2c3d4-5555-6666-7777-88889999aaaa' })
    @IsUUID()
    clientId: string;

    @ApiPropertyOptional({ example: '999.99' })
    @IsOptional()
    @IsString()
    price?: string | null;

    @ApiPropertyOptional({ example: 'c0ffee00-1111-2222-3333-444455556666' })
    @IsOptional()
    @IsUUID()
    groupId?: string | null;

    @ApiPropertyOptional({ example: 'd00df00d-1111-2222-3333-444455556666' })
    @IsOptional()
    @IsUUID()
    photoId?: string | null;
}
