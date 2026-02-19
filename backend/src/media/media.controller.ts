import { Controller, Logger, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('media')
export class MediaController {
    private readonly logger = new Logger(MediaController.name);

    constructor() {
        // Garantir diretório de uploads
        if (!fs.existsSync('./media/uploads')) {
            fs.mkdirSync('./media/uploads', { recursive: true });
        }
    }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './media/uploads',
            filename: (req, file, cb) => {
                const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
                return cb(null, `${randomName}${extname(file.originalname)}`);
            },
        }),
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    }))
    uploadFile(@UploadedFile() file: any) { // Tipo 'any' para evitar erro de Express.Multer não encontrado
        this.logger.log(`📁 Arquivo recebido: ${file.originalname} (${file.size} bytes)`);
        return {
            url: `/media/uploads/${file.filename}`,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size,
        };
    }
}
