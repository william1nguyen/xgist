import client from "prom-client";

// Enable collection of default metrics
client.collectDefaultMetrics();

export const register = client.register;

export const httpRequestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export type MetricsLabels = {
  method: string;
  route: string;
  status: string | number;
};

export const observeHttp = (labels: MetricsLabels, durationSeconds: number) => {
  httpRequestCounter.inc({
    method: labels.method,
    route: labels.route,
    status: String(labels.status),
  });
  httpRequestDuration.observe(
    {
      method: labels.method,
      route: labels.route,
      status: String(labels.status),
    },
    durationSeconds
  );
};

// Domain-specific metrics
export const videoUploadedCounter = new client.Counter({
  name: "video_uploaded_total",
  help: "Total uploaded videos",
  labelNames: ["userId", "category"],
});

export const videoSummarizedCounter = new client.Counter({
  name: "video_summarized_total",
  help: "Total summarized videos",
  labelNames: ["userId"],
});

type LabelRecord = Record<string, string>;

interface MetricValueJson {
  labels?: Record<string, string>;
  value: number;
}

interface MetricJson {
  name: string;
  values?: MetricValueJson[];
}

export const getCounterValue = async (
  metricName: string,
  labelFilter: LabelRecord
): Promise<number> => {
  const metrics = (await register.getMetricsAsJSON()) as MetricJson[];
  const metric = metrics.find((m) => m.name === metricName);
  if (!metric) return 0;
  if (!Array.isArray(metric.values)) return 0;
  const match = metric.values.find((s) => {
    const labels = s.labels ?? {};
    return Object.entries(labelFilter).every(([k, v]) => String(labels[k]) === String(v));
  });
  return match?.value ?? 0;
};

// BullMQ metrics
export const bullQueueGauge = new client.Gauge({
  name: "bull_queue_jobs",
  help: "BullMQ queue metrics",
  labelNames: ["queue", "state"],
});

export const observeBullQueue = (
  queue: string,
  stats: { waiting: number; active: number; completed: number; failed: number; delayed: number }
) => {
  bullQueueGauge.set({ queue, state: "waiting" }, stats.waiting);
  bullQueueGauge.set({ queue, state: "active" }, stats.active);
  bullQueueGauge.set({ queue, state: "completed" }, stats.completed);
  bullQueueGauge.set({ queue, state: "failed" }, stats.failed);
  bullQueueGauge.set({ queue, state: "delayed" }, stats.delayed);
};


