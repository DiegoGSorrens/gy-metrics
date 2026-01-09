export class MetricAggregation {
  period!: string;
  total!: number;
  avg!: number;
  count!: number;
}

export type AggType = 'DAY' | 'MONTH' | 'YEAR';
