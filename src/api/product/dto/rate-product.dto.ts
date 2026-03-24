import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RateProductDto {
    @ApiProperty({ example: 5, description: 'Rating score from 1 to 5', minimum: 1, maximum: 5 })
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(5)
    score: number;
}
