import { Controller, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { TokenService } from 'src/infrastructure/token/Token';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly token: TokenService) { }

    /**
     * POST /api/v1/auth/refresh
     *
     * Reads the refreshToken from the httpOnly cookie "token",
     * verifies it, issues a new accessToken.
     *
     * Flow:
     *   1. Read cookie["token"]
     *   2. verifyRefreshToken → throws 401 if expired/invalid
     *   3. Issue new accessToken (same payload: id, role, isActive)
     *   4. Return { accessToken }
     */
    @ApiOperation({ summary: 'Access tokenni yangilash (cookie dagi refresh token orqali)' })
    @ApiResponse({
        status: 200,
        description: 'Yangi access token qaytarildi',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: { accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
            },
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Refresh token yo\'qolgan yoki eskirgan',
        schema: { example: { statusCode: 401, message: 'Refresh token missing', error: 'Unauthorized' } },
    })
    @Post('refresh')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken: string | undefined = (req.cookies as any)?.['token'];

        if (!refreshToken) {
            throw new UnauthorizedException('Refresh token missing');
        }

        // Will throw 401 if expired or wrong type
        const payload = await this.token.verifyRefreshToken(refreshToken);

        // Issue new access token
        const accessToken = await this.token.accessToken({
            id: payload.id,
            role: payload.role,
            isActive: payload.isActive,
        });

        return { accessToken };
    }
}
