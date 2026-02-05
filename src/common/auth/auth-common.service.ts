import { BadRequestException, Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Repository } from 'typeorm';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { TokenService } from 'src/infrastructure/token/Token';
import { successRes } from 'src/infrastructure/response/success.response';
import { IToken } from 'src/infrastructure/token/interface';

type LoginResult<T> = {
    accessToken: string;
    role: string;
    user: T;
};

@Injectable()
export class AuthCommonService {
    constructor(
        private readonly crypto: CryptoService,
        private readonly token: TokenService,
    ) { }

    /**
     * Universal login:
     * - user topilmasa: "Username or password incorrect"
     * - pass match bo‘lmasa: "Username or password incorrect"
     * - inactive bo‘lsa ham: "Username or password incorrect" (security)
     */
    async signIn<T extends { id: string; password: string; role: any; isActive?: boolean }>(params: {
        repo: Repository<T>;
        where: any; // { username } yoki [{username}, {phoneNumber}] ...
        password: string;
        res: Response;
        cookieKey?: string;      // default: 'token'
        cookieDays?: number;     // default: 15
        safeUser?: (u: T) => any; // passwordni olib tashlash
        extraData?: (u: T) => Record<string, any>;
    }) {
        const {
            repo,
            where,
            password,
            res,
            cookieKey = 'token',
            cookieDays = 15,
            safeUser,
            extraData,
        } = params;

        const user = await repo.findOne({ where });
        if (!user) throw new BadRequestException('Username or password incorrect');

        // isActive false bo‘lsa ham shu xabar (security)
        if (user.isActive === false)
            throw new BadRequestException('Username or password incorrect');

        const isMatch = await this.crypto.decrypt(password, user.password);
        if (!isMatch)
            throw new BadRequestException('Username or password incorrect');

        const payload: IToken = { id: user.id, role: String(user.role), isActive: user.isActive };

        const accessToken = await this.token.accessToken(payload);
        const refreshToken = await this.token.refreshToken(payload);

        this.token.writeCookie(res, cookieKey, refreshToken, cookieDays);

        const safe = safeUser ? safeUser(user) : user;

        return successRes<LoginResult<any>>(
            {
                accessToken,
                role: String(user.role),
                user: safe,
                ...(extraData ? extraData(user) : {}),
            },
            200,
        );
    }
}
