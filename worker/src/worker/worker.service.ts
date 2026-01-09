import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import { BlobServiceClient } from '@azure/storage-blob';
import { DbService } from './db.service';

@Injectable()
export class WorkerService implements OnModuleInit {
  private queue!: string;
  private blobService!: BlobServiceClient;
  private containerName!: string;

  constructor(
    private config: ConfigService,
    private db: DbService,
  ) {}

  async onModuleInit() {
    // ---- Rabbit config ----
    const rabbitUrl = this.config.get<string>('RABBITMQ_URL') || 'amqp://localhost';
    this.queue = this.config.get<string>('RABBITMQ_QUEUE') || 'file-uploads';

    // ---- Azure/Azurite config ----
    const connStr = this.config.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    if (!connStr) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING não definido no .env');
    }

    this.containerName = this.config.get<string>('AZURE_CONTAINER_NAME') || 'uploads';
    this.blobService = BlobServiceClient.fromConnectionString(connStr);

    // ---- Rabbit connect ----
    const conn = await amqp.connect(rabbitUrl);
    const channel = await conn.createChannel();
    await channel.assertQueue(this.queue, { durable: true });

    // processa 1 por vez (mais seguro pra início)
    channel.prefetch(1);

    console.log(`[worker] Consumindo fila: ${this.queue}`);

    await channel.consume(this.queue, async (msg) => {
      if (!msg) return;

      try {
        // 1) ler mensagem
        const content = msg.content.toString('utf-8');
        const { blobName } = JSON.parse(content);

        if (!blobName) throw new Error('Mensagem sem blobName');

        console.log(`[worker] Recebi blobName: ${blobName}`);

        // 2) baixar do azurite
        const container = this.blobService.getContainerClient(this.containerName);
        const blob = container.getBlobClient(blobName);

        const downloadResp = await blob.download();
        const buffer = await this.streamToBuffer(downloadResp.readableStreamBody);

        console.log(`[worker] Download OK (${buffer.length} bytes). Primeiros 120 chars:`);
        console.log(buffer.toString('utf-8').slice(0, 120));

        // 3) parse CSV
        const text = buffer.toString('utf-8');

        const lines = text
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean);

        // header
        const header = lines.shift();

        // valida só colunas 1 e 3 (aceita dateTime/datetime)
        const headerCols = (header || '')
          .split(';')
          .map((s) => s.trim().toLowerCase());

        if (
          headerCols.length !== 3 ||
          headerCols[0] !== 'metricid' ||
          headerCols[2] !== 'value'
        ) {
          throw new Error(`Header inesperado: ${header}`);
        }

        type Row = {
          metricId: number;
          metricDateTime: Date;
          metricDate: string;
          value: number;
        };

        const rows: Row[] = [];

        for (const line of lines) {
          const [metricIdStr, dateTimeStr, valueStr] = line.split(';');
          if (!metricIdStr || !dateTimeStr || !valueStr) continue;

          const metricId = Number(metricIdStr);
          const value = Number(valueStr);

          // dateTime vem como "DD/MM/YYYY HH:mm"
          const [datePart, timePart] = dateTimeStr.split(' ');
          if (!datePart || !timePart) continue;

          const [dd, mm, yyyy] = datePart.split('/').map(Number);
          const [HH, Min] = timePart.split(':').map(Number);

          if (!dd || !mm || !yyyy || HH === undefined || Min === undefined) continue;

          // cria Date em horário local
          const dt = new Date(yyyy, mm - 1, dd, HH, Min, 0);

          // metric_date em yyyy-mm-dd (string OK pro Postgres)
          const metricDate = `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;

          rows.push({ metricId, metricDateTime: dt, metricDate, value });
        }

        console.log(`[worker] Linhas parseadas: ${rows.length}`);

        if (rows.length === 0) {
          console.log('[worker] Nada para inserir.');
          channel.ack(msg);
          return;
        }

        // 4) INSERT em batches (evita SQL gigante)
        const batchSize = 1000;

        for (let start = 0; start < rows.length; start += batchSize) {
          const batch = rows.slice(start, start + batchSize);

          const valuesSql: string[] = [];
          const params: any[] = [];

          batch.forEach((r, i) => {
            const base = i * 4;
            valuesSql.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
            params.push(r.metricId, r.metricDateTime, r.metricDate, r.value);
          });

          const sql = `
            INSERT INTO metric_values (metric_id, metric_datetime, metric_date, value)
            VALUES ${valuesSql.join(', ')}
          `;

          await this.db.query(sql, params);
        }

        console.log(`[worker] Insert OK: ${rows.length} linhas`);

        // 5) ack
        channel.ack(msg);
      } catch (err: any) {
        console.error('[worker] Erro processando mensagem:', err?.message || err);

        // enquanto testa: NÃO requeue para não repetir infinito
        channel.nack(msg, false, false);
      }
    });
  }

  private async streamToBuffer(
    stream: NodeJS.ReadableStream | null | undefined,
  ): Promise<Buffer> {
    if (!stream) return Buffer.from('');
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }
}
