import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

// ────────────────────────────────────────────────────
// Umumiy xato response'lar
// ────────────────────────────────────────────────────

export const ApiUnauthorized = () =>
    ApiResponse({
        status: 401,
        description: 'Token yo\'q yoki muddati o\'tgan',
        schema: {
            example: {
                statusCode: 401,
                error: 'Unauthorized',
                message: 'Unauthorized',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/...',
                method: 'GET',
            },
        },
    });

export const ApiForbidden = () =>
    ApiResponse({
        status: 403,
        description: 'Ruxsat yo\'q (role mos kelmaydi)',
        schema: {
            example: {
                statusCode: 403,
                error: 'Forbidden',
                message: 'Forbidden resource',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/...',
                method: 'GET',
            },
        },
    });

export const ApiNotFound = (resource = 'Resurs') =>
    ApiResponse({
        status: 404,
        description: `${resource} topilmadi`,
        schema: {
            example: {
                statusCode: 404,
                error: 'Not Found',
                message: 'Not found',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/...',
                method: 'GET',
            },
        },
    });

export const ApiValidation = () =>
    ApiResponse({
        status: 422,
        description: 'Validatsiya xatosi',
        schema: {
            example: {
                statusCode: 422,
                error: 'Unprocessable Entity',
                message: ['field must not be empty'],
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/...',
                method: 'POST',
            },
        },
    });

export const ApiConflict = (message = 'Duplicate entry') =>
    ApiResponse({
        status: 409,
        description: 'Ma\'lumot allaqachon mavjud',
        schema: {
            example: {
                statusCode: 409,
                error: 'Conflict',
                message,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/...',
                method: 'POST',
            },
        },
    });

export const ApiRateLimit = () =>
    ApiResponse({
        status: 429,
        description: 'Juda ko\'p so\'rov — rate limit',
        schema: {
            example: {
                statusCode: 429,
                error: 'TooManyRequests',
                message: 'Rate limit exceeded (Potential DDoS attack)',
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/...',
                method: 'POST',
            },
        },
    });

export const ApiBadRequest = (message = 'Noto\'g\'ri so\'rov') =>
    ApiResponse({
        status: 400,
        description: message,
        schema: {
            example: {
                statusCode: 400,
                error: 'Bad Request',
                message,
                timestamp: '2024-01-01T00:00:00.000Z',
                path: '/api/v1/...',
                method: 'POST',
            },
        },
    });

// ────────────────────────────────────────────────────
// Umumiy muvaffaqiyatli response wrapper builder
// ────────────────────────────────────────────────────
export const ApiSuccessResponse = (status: number, dataExample: any, description = '') =>
    ApiResponse({
        status,
        description,
        schema: {
            example: {
                statusCode: status,
                message: status < 300 ? 'Amaliyot muvaffaqiyatli bajarildi' : undefined,
                data: dataExample,
            },
        },
    });

export const ApiDeletedResponse = () =>
    ApiResponse({
        status: 200,
        description: 'Muvaffaqiyatli o\'chirildi',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: { deleted: true },
            },
        },
    });

export const ApiOtpSentResponse = () =>
    ApiResponse({
        status: 200,
        description: 'OTP SMS ga yuborildi',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: { message: 'OTP yuborildi' },
            },
        },
    });

export const ApiVerifiedResponse = () =>
    ApiResponse({
        status: 200,
        description: 'OTP tasdiqlandi',
        schema: {
            example: {
                statusCode: 200,
                message: 'Amaliyot muvaffaqiyatli bajarildi',
                data: { verified: true },
            },
        },
    });
