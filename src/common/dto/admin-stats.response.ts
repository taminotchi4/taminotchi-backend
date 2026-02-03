import { ApiProperty } from '@nestjs/swagger';

class CountBlock {
    @ApiProperty({ example: 120 })
    total: number;

    @ApiProperty({ example: 80, required: false })
    active?: number;
}

class ElonStatusBlock {
    @ApiProperty({ example: 90 })
    negotiation: number;

    @ApiProperty({ example: 30 })
    agreed: number;
}

class TrendPoint {
    @ApiProperty({ example: '2026-01-31' })
    day: string;

    @ApiProperty({ example: 12 })
    count: number;
}

export class AdminStatsResponseDto {
    @ApiProperty({ type: CountBlock })
    admins: CountBlock;

    @ApiProperty({ type: CountBlock })
    clients: CountBlock;

    @ApiProperty({ type: CountBlock })
    markets: CountBlock;

    @ApiProperty({ type: CountBlock })
    categories: CountBlock;

    @ApiProperty({ type: CountBlock })
    groups: CountBlock;

    @ApiProperty({ type: CountBlock })
    elons: CountBlock;

    @ApiProperty({ type: CountBlock })
    products: CountBlock;

    @ApiProperty({ type: ElonStatusBlock, required: false })
    elonStatus?: ElonStatusBlock;

    @ApiProperty({ type: TrendPoint, isArray: true })
    elonsLast7Days: TrendPoint[];

    @ApiProperty({ type: TrendPoint, isArray: true })
    productsLast7Days: TrendPoint[];

    @ApiProperty({ type: TrendPoint, isArray: true })
    messagesLast7Days: TrendPoint[];
}
