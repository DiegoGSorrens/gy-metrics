import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type AggType = 'DAY' | 'MONTH' | 'YEAR';

@Injectable({ providedIn: 'root' })
export class MetricsApiService {
  private baseUrl = '/api';

  constructor(private http: HttpClient) {}

  getAggregations(metricId: number, type: AggType, dateInitial: string, finalDate: string): Observable<any> {
    const params = new HttpParams()
      .set('metricId', String(metricId))
      .set('type', type)
      .set('dateInitial', dateInitial)
      .set('finalDate', finalDate);

    return this.http.get(`${this.baseUrl}/metrics/aggregations`, { params });
  }

  postReport(payload: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/metrics/report`, payload);
  }
}
