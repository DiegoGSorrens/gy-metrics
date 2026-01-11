import { BadRequestException, Injectable } from '@nestjs/common';
import { DbService } from '../db.service';
import { MetricAggregation, AggType } from '../domain/metric-aggregation.model';
import ExcelJS from 'exceljs';

@Injectable()
export class MetricsService {
  constructor(private db: DbService) {}

  async getAggregations(
    metricId: number,
    type: AggType,
    dateInitial: string,
    finalDate: string,
  ) {
    if (!metricId || Number.isNaN(metricId))
      throw new BadRequestException('metricId inválido');
    if (!dateInitial || !finalDate)
      throw new BadRequestException('dateInitial/finalDate são obrigatórios');
    if (!['DAY', 'MONTH', 'YEAR'].includes(type))
      throw new BadRequestException('type deve ser DAY, MONTH ou YEAR');

    const trunc = type === 'DAY' ? 'day' : type === 'MONTH' ? 'month' : 'year';

    const sql = `
      SELECT
        DATE_TRUNC('${trunc}', metric_datetime) AS period,
        SUM(value) AS total,
        AVG(value) AS avg,
        COUNT(*) AS count
      FROM metric_values
      WHERE metric_id = $1
        AND metric_date BETWEEN $2::date AND $3::date
      GROUP BY 1
      ORDER BY 1;
    `;

    const result = await this.db.query(sql, [metricId, dateInitial, finalDate]);

    return result.rows.map((row) => {
      const agg = new MetricAggregation();
      agg.period = row.period.toISOString().slice(0, 10);
      agg.total = Number(row.total);
      agg.avg = Number(row.avg);
      agg.count = Number(row.count);
      return agg;
    });
  }

  private async queryAggregation(
    metricId: number,
    type: AggType,
    dateInitial: string,
    finalDate: string,
  ) {
    const trunc = type === 'DAY' ? 'day' : type === 'MONTH' ? 'month' : 'year';

    const sql = `
      SELECT
        DATE_TRUNC('${trunc}', metric_datetime) AS period,
        SUM(value) AS total,
        AVG(value) AS avg,
        COUNT(*) AS count
      FROM metric_values
      WHERE metric_id = $1
        AND metric_date BETWEEN $2::date AND $3::date
      GROUP BY 1
      ORDER BY 1;
    `;

    const result = await this.db.query(sql, [metricId, dateInitial, finalDate]);

    return result.rows.map((r: any) => ({
      type,
      period:
        r.period instanceof Date ? r.period.toISOString() : String(r.period),
      total: Number(r.total),
      avg: Number(r.avg),
      count: Number(r.count),
    }));
  }

  private keyFromPeriod(type: AggType, periodIso: string): string {
    const ymd = periodIso.slice(0, 10);
    if (type === 'DAY') return ymd;
    if (type === 'MONTH') return ymd.slice(0, 7);
    return ymd.slice(0, 4);
  }

  async buildReportXlsx(
    metricId: number,
    dateInitial: string,
    finalDate: string,
  ): Promise<Buffer> {
    if (!metricId || Number.isNaN(metricId))
      throw new BadRequestException('metricId inválido');
    if (!dateInitial || !finalDate)
      throw new BadRequestException('dateInitial/finalDate obrigatórios');

    const dayAgg = await this.queryAggregation(
      metricId,
      'DAY',
      dateInitial,
      finalDate,
    );
    const monthAgg = await this.queryAggregation(
      metricId,
      'MONTH',
      dateInitial,
      finalDate,
    );
    const yearAgg = await this.queryAggregation(
      metricId,
      'YEAR',
      dateInitial,
      finalDate,
    );

    const monthMap = new Map<string, number>();
    for (const m of monthAgg) {
      const monthKey = this.keyFromPeriod('MONTH', m.period);
      monthMap.set(monthKey, m.total);
    }

    const yearMap = new Map<string, number>();
    for (const y of yearAgg) {
      const yearKey = this.keyFromPeriod('YEAR', y.period);
      yearMap.set(yearKey, y.total);
    }

    const rows = dayAgg.map((d) => {
      const dayKey = this.keyFromPeriod('DAY', d.period);
      const monthKey = dayKey.slice(0, 7);
      const yearKey = dayKey.slice(0, 4);

      return {
        metricId,
        dateTime: dayKey,
        aggDay: d.total,
        aggMonth: monthMap.get(monthKey) ?? 0,
        aggYear: yearMap.get(yearKey) ?? 0,
      };
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Report');

    ws.addRow(['MetricId', 'DateTime', 'AggDay', 'AggMonth', 'AggYear']);

    for (const r of rows) {
      ws.addRow([r.metricId, r.dateTime, r.aggDay, r.aggMonth, r.aggYear]);
    }

    ws.getRow(1).font = { bold: true };
    ws.columns = [
      { width: 12 },
      { width: 14 },
      { width: 10 },
      { width: 10 },
      { width: 10 },
    ];

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
