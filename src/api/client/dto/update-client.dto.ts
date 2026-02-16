import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from 'src/common/enum/index.enum';

export class UpdateClientDto extends PartialType(CreateClientDto) {
    @ApiPropertyOptional({ example: UserRole.CLIENT, enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
