import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationEntity } from 'src/core/entity/notification.entity';
import { config } from 'src/config';

@Module({
    imports: [
        TypeOrmModule.forFeature([NotificationEntity]),
        JwtModule.register({
            secret: config.TOKEN.ACCESS_TOKEN_KEY,
            signOptions: { expiresIn: config.TOKEN.ACCESS_TOKEN_TIME },
        }),
    ],
    controllers: [NotificationController],
    providers: [NotificationService, NotificationGateway],
    exports: [NotificationService, NotificationGateway],
})
export class NotificationModule { }
