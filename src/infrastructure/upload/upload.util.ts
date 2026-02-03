import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

type AllowedGroup = 'image' | 'audio' | 'any';

type UploadOptions = {
    folder: string;              // masalan: 'category' yoki 'message/audio'
    allowed?: AllowedGroup;      // default: 'any'
    maxSizeMb?: number;          // default: 5
};

function ensureDir(path: string) {
    if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function randomName(originalName: string) {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return `${unique}${extname(originalName)}`;
}

function allowByGroup(mimetype: string, group: AllowedGroup) {
    if (group === 'any') return true;
    if (group === 'image') return mimetype?.startsWith('image/');
    if (group === 'audio') return mimetype?.startsWith('audio/');
    return false;
}

/**
 * Universal multer options factory
 * Diskga saqlaydi + papkani auto create qiladi + mime/size tekshiradi
 */
export function buildMulterOptions(opts: UploadOptions) {
    const folder = opts.folder.replace(/^\//, ''); // '/category' kelsa ham
    const dest = join(process.cwd(), 'uploads', folder);
    const allowed = opts.allowed ?? 'any';
    const maxSizeMb = opts.maxSizeMb ?? 5;

    ensureDir(dest);

    return {
        storage: diskStorage({
            destination: (_req, _file, cb) => cb(null, dest),
            filename: (_req, file, cb) => cb(null, randomName(file.originalname)),
        }),
        limits: {
            fileSize: maxSizeMb * 1024 * 1024,
        },
        fileFilter: (_req: any, file: any, cb: any) => {
            if (!allowByGroup(file.mimetype, allowed)) {
                return cb(
                    new BadRequestException(
                        allowed === 'image'
                            ? 'Only image files are allowed'
                            : allowed === 'audio'
                                ? 'Only audio files are allowed'
                                : 'File type is not allowed',
                    ),
                    false,
                );
            }
            cb(null, true);
        },
    };
}

/**
 * Diskdagi file -> DBga yoziladigan path (relative url)
 */
export function toPublicPath(folder: string, filename: string) {
    const clean = folder.replace(/^\//, '');
    return `/uploads/${clean}/${filename}`;
}
