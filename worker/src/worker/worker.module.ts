import { Module } from '@nestjs/common';
import { WorkerController } from './worker.controller';
import { WorkerService } from './worker.service';
import { DbService } from './db.service';

@Module({
  controllers: [WorkerController],
  providers: [WorkerService, DbService],
})
export class WorkerModule {}
