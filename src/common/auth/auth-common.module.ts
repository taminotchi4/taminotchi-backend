import { Module } from '@nestjs/common';
import { AuthCommonService } from './auth-common.service';
import { CryptoService } from 'src/infrastructure/crypto/crypto.service';
import { TokenService } from 'src/infrastructure/token/Token';

@Module({
    providers: [AuthCommonService, CryptoService, TokenService],
    exports: [AuthCommonService],
})
export class AuthCommonModule { }
