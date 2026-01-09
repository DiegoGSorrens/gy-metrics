import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import type { AggType } from '../domain/metric-aggregation.model';
import type { Response } from 'express';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('aggregations')
  async aggregations(
    @Query('metricId') metricId: string,
    @Query('type') type: AggType,
    @Query('dateInitial') dateInitial: string,
    @Query('finalDate') finalDate: string,
  ) {
    const mid = Number(metricId);

    const data = await this.metricsService.getAggregations(
      mid,
      type,
      dateInitial,
      finalDate,
    );

    return {
      metricId: mid,
      type,
      dateInitial,
      finalDate,
      data,
    };
  }

  @Post('report')
  async report(
    @Body() body: { metricId: number; dateInitial: string; finalDate: string },
    @Res() res: Response,
  ) {
    const { metricId, dateInitial, finalDate } = body;

    const xlsxBuffer = await this.metricsService.buildReportXlsx(
      Number(metricId),
      dateInitial,
      finalDate,
    );

    const filename = `report_metric_${metricId}_${dateInitial}_to_${finalDate}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(xlsxBuffer);
  }
}
