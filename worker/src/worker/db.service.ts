import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DbService implements OnModuleDestroy {
  private pool: Pool;

  constructor(private config: ConfigService) {
    this.pool = new Pool({
      host: this.config.get<string>('POSTGRES_HOST') || 'localhost',
      port: Number(this.config.get<string>('POSTGRES_PORT') || 5432),
      user: this.config.get<string>('POSTGRES_USER') || 'gy',
      password: this.config.get<string>('POSTGRES_PASSWORD') || 'gy',
      database: this.config.get<string>('POSTGRES_DB') || 'gydb',
    });
  }

  async query(text: string, params: any[] = []) {
    return this.pool.query(text, params);
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
