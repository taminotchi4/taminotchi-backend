import { Global, Module } from '@nestjs/common';
import { FirebasePushService } from './firebase-push.service';

/**
 * Global module — AppModule da bir marta import qilinadi,
 * boshqa modullarda qayta import kerak emas.
 */
@Global()
@Module({
    providers: [FirebasePushService],
    exports: [FirebasePushService],
})
export class FirebaseModule { }
