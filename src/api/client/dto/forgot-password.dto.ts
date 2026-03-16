import { ApiProperty } from '@nestjs/swagger';
import { IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class ResetClientPasswordDto {
    @ApiProperty({ example: '+998901234567' })
    @IsPhoneNumber('UZ')
    phoneNumber: string;

    @ApiProperty({ example: 'NewSecurePass123' })
    @IsString()
    @MinLength(6)
    newPassword: string;
}
