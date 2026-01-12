import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  inject,
  NgZone,
  OnInit,
  signal,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MetricsApiService, AggType } from './services/metrics-api.service';
import type { MetricsAggregationRow } from './services/metrics-api.service';

import { FormsModule } from '@angular/forms';
import { lastValueFrom } from 'rxjs';

type FiltersForm = {
  metricId: number;
  type: AggType;
  dateInitial: string;
  finalDate: string;
};
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, AfterViewInit {
  protected readonly title = signal('frontend');

  private api = inject(MetricsApiService);

  private cdr = inject(ChangeDetectorRef);

  types: AggType[] = ['DAY', 'MONTH', 'YEAR'];

  loading = false;
  error = '';
  rows: MetricsAggregationRow[] = [];
  private zone = inject(NgZone);

  form: FiltersForm = {
    metricId: 218219,
    type: 'DAY',
    dateInitial: '2023-11-01',
    finalDate: '2023-11-30',
  };

  selectedFile: File | null = null;
  uploading = false;
  uploadError = '';
  uploadOk = '';

  async ngOnInit() {}

  ngAfterViewInit() {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.uploadError = '';
    this.uploadOk = '';
  }

  sendFile() {
    if (!this.selectedFile) return;
    this.uploadError = '';
    this.uploadOk = '';

    this.api.uploadFile(this.selectedFile).subscribe({
      next: () => {
        this.uploadOk = 'Arquivo enviado';
        window.location.reload();
      },
      error: (err) => {
        this.uploadError = err?.error?.message || err?.message || 'Erro no upload';
      },
    });
  }

  async getAggregations() {
    try {
      this.loading = true;
      this.error = '';

      const data = await this.api.getAggregations(
        this.form.metricId,
        this.form.type,
        this.form.dateInitial,
        this.form.finalDate
      );

      this.rows = Array.isArray(data) ? data : data.data ?? [];
    } catch (err: any) {
      this.error = err?.message || 'Erro';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async downloadReport() {
    try {
      this.error = '';

      const payload = {
        metricId: this.form.metricId,
        dateInitial: this.form.dateInitial,
        finalDate: this.form.finalDate,
      };

      const blob = await lastValueFrom(this.api.postReport(payload));

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_metric_${payload.metricId}_${payload.dateInitial}_to_${payload.finalDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      this.error = err?.error?.message || err?.message || 'Erro ao baixar relatório';
      this.cdr.markForCheck();
    }
  }

  formatValue(v: any) {
    if (v === null || v === undefined) return '-';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('pt-BR') : String(v);
  }
}
