import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Request } from 'express';
import { config } from 'src/config';

type LangMessage = { uz: string; ru: string };

@Injectable()
export class SuccessMessageInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request>() as any;
    const lang = (req?.lang as 'uz' | 'ru' | undefined) ?? 'uz';
    const base = (config.BACKEND_URL || '').replace(/\/+$/, '');

    return next.handle().pipe(
      map((body) => {
        if (!body || typeof body !== 'object') return body;
        const msg = body.message as string | LangMessage | undefined;
        if (msg && typeof msg === 'object' && 'uz' in msg && 'ru' in msg) {
          body = { ...body, message: lang === 'ru' ? msg.ru : msg.uz };
        }
        return this.mapUploadUrls(body, base);
      }),
    );
  }

  private mapUploadUrls(value: any, base: string): any {
    if (Array.isArray(value)) {
      return value.map((v) => this.mapUploadUrls(v, base));
    }
    if (!value || typeof value !== 'object') return value;

    const out: any = Array.isArray(value) ? [] : { ...value };
    for (const [k, v] of Object.entries(out)) {
      if (typeof v === 'string') {
        if (/^https?:\/\//i.test(v)) {
          out[k] = v;
        } else if (v.startsWith('/uploads/')) {
          out[k] = base ? `${base}${v}` : v;
        }
      } else if (v && typeof v === 'object') {
        out[k] = this.mapUploadUrls(v, base);
      }
    }
    return out;
  }
}
