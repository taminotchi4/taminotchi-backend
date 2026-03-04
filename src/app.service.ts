import {
  ClassSerializerInterceptor,
  HttpStatus,
  Injectable,
  ValidationPipe,
  UnprocessableEntityException,
} from '@nestjs/common';
import { HttpAdapterHost, NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './infrastructure/exception/All-exception-filter';
import { config } from './config/index';
import { join } from 'path';
import { SuccessMessageInterceptor } from './common/interceptor/success-message.interceptor';

@Injectable()
export class Application {
  private readonly API_PREFIX = 'api/v1';
  private readonly SWAGGER_PATH = 'api/docs';
  private readonly CORS_METHODS = 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';

  async start(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    this.setupProxy(app);
    // this.setupCors(app);
    this.setupGlobalPrefix(app);
    this.setupMiddlewares(app);
    this.setupInterceptors(app);
    this.setupFilters(app);
    this.setupPipes(app);
    this.setupSwagger(app);

    await this.startServer(app);
  }

  /**
   * ✅ Render/NGINX/Cloudflare ortida bo‘lsa IP va protocol to‘g‘ri chiqishi uchun
   */
  private setupProxy(app: NestExpressApplication): void {
    // Express setting
    app.set('trust proxy', 1);
  }

  // private setupCors(app: NestExpressApplication): void {
  //   const origins = (config.CORS_ORIGINS || '')
  //     .split(',')
  //     .map((s) => s.trim())
  //     .filter(Boolean);

  //   app.enableCors({
  //     origin: (origin, callback) => {
  //       // Mobile app / Postman / server-to-server calllarda origin bo‘lmasligi mumkin
  //       if (!origin) return callback(null, true);

  //       // Agar origins list bo‘sh bo‘lsa, hammasiga ruxsat (dev)
  //       if (!origins.length) return callback(null, true);

  //       // Whitelist
  //       if (origins.includes(origin)) return callback(null, true);

  //       return callback(new Error('Not allowed by CORS'), false);
  //     },
  //     credentials: true,
  //     methods: this.CORS_METHODS,
  //   });
  // }

  private setupGlobalPrefix(app: NestExpressApplication): void {
    app.setGlobalPrefix(this.API_PREFIX);
  }

  private setupMiddlewares(app: NestExpressApplication): void {
    app.use(cookieParser());

    app.useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads/',
    });
  }

  private setupInterceptors(app: NestExpressApplication): void {
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
      new SuccessMessageInterceptor(),
    );
  }

  private setupFilters(app: NestExpressApplication): void {
    const httpAdapter = app.get(HttpAdapterHost);
    app.useGlobalFilters(new AllExceptionsFilter(httpAdapter));
  }

  private setupPipes(app: NestExpressApplication): void {
    app.useGlobalPipes(this.createValidationPipe());
  }

  private createValidationPipe(): ValidationPipe {
    return new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      transformOptions: { enableImplicitConversion: false },
      validationError: { target: false },
      stopAtFirstError: true,
      // prod’da ham foydali bo‘lishi uchun: message list qoladi (xavfsiz)
      disableErrorMessages: false,
      exceptionFactory: (errors) => {
        const messages = errors
          .map((err) => Object.values(err.constraints || {}))
          .flat();

        throw new UnprocessableEntityException({
          statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          message: messages.length ? messages : ['Validation failed'],
          error: 'Unprocessable Entity',
        });
      },
    });
  }

  private setupSwagger(app: NestExpressApplication): void {
    // prod’da swagger yoqilmasin desang config bilan boshqaramiz
    // if (config.NODE_ENV === 'production') {
    //   return;
    // }

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Platform API')
      .setDescription('Platform API documentation')
      .setVersion('1.0')
      .addTag('API')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          in: 'header',
        },
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(this.SWAGGER_PATH, app, document);
  }

  private async startServer(app: NestExpressApplication): Promise<void> {
    const port = Number(process.env.PORT || config.PORT || 3009);

    await app.listen(port);

    console.log(`✅ Server running: ${config.BACKEND_URL ?? `http://localhost:${port}`}`);
    console.log(`📚 Swagger: ${config.SWAGGER_URL ?? `http://localhost:${port}/${this.SWAGGER_PATH}`}`);
  }
}
