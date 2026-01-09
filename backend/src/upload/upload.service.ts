import { Injectable, BadRequestException } from '@nestjs/common';
import { StorageService } from './storage.service';
import { RabbitService } from './rabbit.service';

@Injectable()
export class UploadService {
  constructor(
    private readonly storage: StorageService,
    private readonly rabbit: RabbitService,
  ) {}

  async handleUpload(file: Express.Multer.File) {
    if (!file)
      throw new BadRequestException('Envie um arquivo no campo "file"');

    const blobName = await this.storage.upload(file);
    await this.rabbit.publish({ blobName });

    return { message: 'Upload OK', blobName };
  }
}
