import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MetricsApiService, AggType } from './services/metrics-api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ReactiveFormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontend');

  private fb = inject(FormBuilder);
  private api = inject(MetricsApiService);

  types: AggType[] = ['DAY','MONTH','YEAR'];
  loading = false;
  error = '';
  rows: any[] = [];

  form = this.fb.group({
    metricId: [1, [Validators.required, Validators.min(1)]],
    type: ['SUM' as AggType, Validators.required],
    dateInitial: ['2025-01-01', Validators.required],
    finalDate: ['2025-12-31', Validators.required],
  });

  load() {
    if (this.form.invalid) return;

    const { metricId, type, dateInitial, finalDate } = this.form.getRawValue();
    this.loading = true;
    this.error = '';
    this.rows = [];

    this.api.getAggregations(metricId!, type!, dateInitial!, finalDate!).subscribe({
      next: (data) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        this.rows = Array.isArray(list) ? list : [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.message || 'Erro ao buscar dados';
        this.loading = false;
      }
    });
  }

  formatValue(v: any) {
    if (v === null || v === undefined) return '-';
    const n = Number(v);
    return Number.isFinite(n) ? n.toLocaleString('pt-BR') : String(v);
  }
}
