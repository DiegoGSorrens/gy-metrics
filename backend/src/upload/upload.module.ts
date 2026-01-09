import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { StorageService } from './storage.service';
import { RabbitService } from './rabbit.service';

@Module({
  controllers: [UploadController],
  providers: [UploadService, StorageService, RabbitService],
})
export class UploadModule {}
