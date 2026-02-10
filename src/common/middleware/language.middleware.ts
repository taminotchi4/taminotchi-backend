import { Injectable, NestMiddleware } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';

import { config } from 'src/config';
import { ClientEntity } from 'src/core/entity/client.entity';
import { MarketEntity } from 'src/core/entity/market.entity';
import { LanguageType, UserRole } from 'src/common/enum/index.enum';
import { IToken } from 'src/infrastructure/token/interface';

@Injectable()
export class LanguageMiddleware implements NestMiddleware {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(ClientEntity)
    private readonly clientRepo: Repository<ClientEntity>,
    @InjectRepository(MarketEntity)
    private readonly marketRepo: Repository<MarketEntity>,
  ) {}

  async use(req: Request & { lang?: 'uz' | 'ru' }, _res: Response, next: NextFunction) {
    const rawCookies = (req as any).cookies;
    let cookieToken = rawCookies?.token as string | undefined;
    if (!cookieToken && req.headers.cookie) {
      const match = req.headers.cookie
        .split(';')
        .map((c) => c.trim())
        .find((c) => c.startsWith('token='));
      if (match) cookieToken = decodeURIComponent(match.split('=')[1] || '');
    }
    if (!cookieToken) {
      req.lang = 'uz';
      return next();
    }

    try {
      const payload = await this.jwt.verifyAsync<IToken>(cookieToken, {
        secret: config.TOKEN.REFRESH_TOKEN_KEY,
      });

      const role = payload?.role as UserRole | undefined;
      if (!role || role === UserRole.ADMIN || role === UserRole.SUPERADMIN) {
        req.lang = 'uz';
        return next();
      }

      if (role === UserRole.CLIENT) {
        const client = await this.clientRepo.findOne({ where: { id: payload.id } as any });
        req.lang = client?.language === LanguageType.RU ? 'ru' : 'uz';
        return next();
      }

      if (role === UserRole.MARKET) {
        const market = await this.marketRepo.findOne({ where: { id: payload.id } as any });
        req.lang = market?.language === LanguageType.RU ? 'ru' : 'uz';
        return next();
      }
    } catch {
      // ignore invalid/expired token
    }

    req.lang = 'uz';
    return next();
  }
}
