import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { lastValueFrom, Observable } from 'rxjs';

export type AggType = 'DAY' | 'MONTH' | 'YEAR';

export type MetricsAggregationRow = {
  period: string;
  total: number;
  avg: number;
  count: number;
};

export type MetricsAggregationResponse =
  | MetricsAggregationRow[]
  | { data: MetricsAggregationRow[] };

@Injectable({ providedIn: 'root' })
export class MetricsApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  async getAggregations(
    metricId: number,
    type: AggType,
    dateInitial: string,
    finalDate: string
  ) {
    const params = new HttpParams()
      .set('metricId', String(metricId))
      .set('type', type)
      .set('dateInitial', dateInitial)
      .set('finalDate', finalDate);
    return await lastValueFrom(
       this.http.get<MetricsAggregationResponse>(`${this.baseUrl}/metrics/aggregations`, { params })
    );
  }

  postReport(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/metrics/report`, payload);
  }

  uploadFile(file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.baseUrl}/upload`, form);
  }
}
