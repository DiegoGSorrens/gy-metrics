SET TIME ZONE 'UTC';

CREATE TABLE IF NOT EXISTS metric_values (
  id BIGSERIAL PRIMARY KEY,
  metric_id BIGINT NOT NULL,
  metric_datetime TIMESTAMP NOT NULL,
  metric_date DATE NOT NULL,
  value NUMERIC NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metric_values_metric_id
  ON metric_values (metric_id);

CREATE INDEX IF NOT EXISTS idx_metric_values_metric_date
  ON metric_values (metric_date);

CREATE INDEX IF NOT EXISTS idx_metric_values_metric_datetime
  ON metric_values (metric_datetime);

