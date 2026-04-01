import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { TokenService } from 'src/infrastructure/token/Token';

@Module({
    controllers: [AuthController],
    providers: [TokenService],
})
export class AuthModule { }
