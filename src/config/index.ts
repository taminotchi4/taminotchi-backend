import * as dotenv from 'dotenv';

dotenv.config();

interface ConfigType {
    DB_URL: string;
    PORT: string;
    NODE_ENV: string;
    ENABLE_GEOIP: boolean;

    TOKEN: {
        ACCESS_TOKEN_KEY: string;
        ACCESS_TOKEN_TIME: number;
        REFRESH_TOKEN_KEY: string;
        REFRESH_TOKEN_TIME: number;
        JWT_SECRET_KEY: string;
    };

    SUPERADMIN: {
        SUPERADMIN_USERNAME: string;
        SUPERADMIN_PASSWORD: string;
        SUPERADMIN_EMAIL: string;
        SUPERADMIN_PHONE_NUMBER: string;
    };

    FILE_PATH: string;

    FRONTEND_URL: string;
    BACKEND_URL: string;
    SWAGGER_URL: string;

    REDIS_URL: string;

    CORS_ORIGINS: string;
}

export const config: ConfigType = {
    DB_URL: String(process.env.DB_URL),
    PORT: String(process.env.PORT),
    NODE_ENV: String(process.env.NODE_ENV),
    ENABLE_GEOIP: String(process.env.ENABLE_GEOIP).toLowerCase() === 'true',

    TOKEN: {
        ACCESS_TOKEN_KEY: String(process.env.ACCESS_TOKEN_KEY),
        ACCESS_TOKEN_TIME: Number(process.env.ACCESS_TOKEN_TIME),
        REFRESH_TOKEN_KEY: String(process.env.REFRESH_TOKEN_KEY),
        REFRESH_TOKEN_TIME: Number(process.env.REFRESH_TOKEN_TIME),
        JWT_SECRET_KEY: String(process.env.JWT_SECRET_KEY),
    },

    SUPERADMIN: {
        SUPERADMIN_USERNAME: String(process.env.SUPERADMIN_USERNAME),
        SUPERADMIN_PASSWORD: String(process.env.SUPERADMIN_PASSWORD),
        SUPERADMIN_EMAIL: String(process.env.SUPERADMIN_EMAIL),
        SUPERADMIN_PHONE_NUMBER: String(process.env.SUPERADMIN_PHONE_NUMBER),
    },

    FILE_PATH: String(process.env.FILE_PATH),

    FRONTEND_URL: String(process.env.FRONTEND_URL),
    BACKEND_URL: String(process.env.BACKEND_URL),
    SWAGGER_URL: String(process.env.SWAGGER_URL),

    REDIS_URL: String(process.env.REDIS_URL),

    CORS_ORIGINS: String(process.env.CORS_ORIGINS),
};
