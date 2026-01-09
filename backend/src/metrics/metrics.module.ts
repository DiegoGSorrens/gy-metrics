import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { DbService } from 'src/db.service';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, DbService],
})
export class MetricsModule {}
