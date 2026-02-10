import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Request } from 'express';

type LangMessage = { uz: string; ru: string };

@Injectable()
export class SuccessMessageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>() as any;
    const lang = (req?.lang as 'uz' | 'ru' | undefined) ?? 'uz';

    return next.handle().pipe(
      map((body) => {
        if (!body || typeof body !== 'object') return body;
        const msg = body.message as string | LangMessage | undefined;
        if (msg && typeof msg === 'object' && 'uz' in msg && 'ru' in msg) {
          return { ...body, message: lang === 'ru' ? msg.ru : msg.uz };
        }
        return body;
      }),
    );
  }
}
