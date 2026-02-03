import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminDto } from './create-admin.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from 'src/common/enum/index.enum';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class UpdateAdminDto extends PartialType(CreateAdminDto) {
    @ApiPropertyOptional({ example: UserRole.ADMIN, enum: UserRole })
    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @ApiPropertyOptional({ example: true })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
