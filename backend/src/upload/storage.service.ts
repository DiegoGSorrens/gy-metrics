import { Injectable } from '@nestjs/common';
import { BlobServiceClient } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';

@Injectable()
export class StorageService {
  private blobService: BlobServiceClient;
  private containerName: string;

  constructor(private config: ConfigService) {
    const conn = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    if (!conn)
      throw new Error('AZURE_STORAGE_CONNECTION_STRING não definido no .env');

    this.containerName =
      this.config.get<string>('AZURE_CONTAINER_NAME') || 'uploads';
    this.blobService = BlobServiceClient.fromConnectionString(conn);
  }

  async upload(file: Express.Multer.File): Promise<string> {
    if (!file)
      throw new Error('Arquivo não foi enviado (field name deve ser "file")');

    const containerClient = this.blobService.getContainerClient(
      this.containerName,
    );
    await containerClient.createIfNotExists();

    const blobName = `${uuid()}-${file.originalname}`;
    const blobClient = containerClient.getBlockBlobClient(blobName);

    await blobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype || 'text/csv' },
    });

    return blobName;
  }
}
