import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { config } from 'src/config';
import { IToken } from './interface';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) { }

  async accessToken(payload: IToken): Promise<string> {
    return this.jwt.signAsync(
      { id: payload.id, role: payload.role, isActive: payload?.isActive, type: 'access' },
      {
        secret: config.TOKEN.ACCESS_TOKEN_KEY,
        expiresIn: `${config.TOKEN.ACCESS_TOKEN_TIME}m`, // minutes
      },
    );
  }

  async refreshToken(payload: IToken): Promise<string> {
    return this.jwt.signAsync(
      { id: payload.id, role: payload.role, isActive: payload?.isActive, type: 'refresh' },
      {
        secret: config.TOKEN.REFRESH_TOKEN_KEY,
        expiresIn: `${config.TOKEN.REFRESH_TOKEN_TIME}d`, // days
      },
    );
  }

  writeCookie(res: Response, key: string, value: string, days: number) {
    const isProd = config.NODE_ENV === 'production';

    res.cookie(key, value, {
      httpOnly: true,
      secure: isProd,                       // localda false bo‘lsin
      sameSite: isProd ? 'none' : 'lax',
      maxAge: days * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  async verifyAccessToken(token: string): Promise<IToken> {
    try {
      const payload = await this.jwt.verifyAsync<IToken>(token, {
        secret: config.TOKEN.ACCESS_TOKEN_KEY,
      });

      if (payload.type && payload.type !== 'access') {
        throw new UnauthorizedException('Wrong token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<IToken> {
    try {
      const payload = await this.jwt.verifyAsync<IToken>(token, {
        secret: config.TOKEN.REFRESH_TOKEN_KEY,
      });

      if (payload.type && payload.type !== 'refresh') {
        throw new UnauthorizedException('Wrong token type');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
