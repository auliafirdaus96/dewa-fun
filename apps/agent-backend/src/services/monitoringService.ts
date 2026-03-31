/**
 * services/monitoringService.ts
 * Real-time monitoring dashboard with metrics collection and alerting
 */

import { EventEmitter } from 'events';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface MetricPoint {
  timestamp: number;
  value: number;
  labels?: Record<string, string>;
}

export interface Metric {
  name: string;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  description: string;
  points: MetricPoint[];
  unit: string;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  lastCheck: number;
  details?: Record<string, any>;
}

export interface AlertRule {
  name: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration: number; // seconds
  severity: 'critical' | 'warning' | 'info';
  channels: ('email' | 'slack' | 'webhook' | 'log')[];
  message: string;
}

export interface Alert {
  id: string;
  ruleName: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  triggeredAt: number;
  resolvedAt?: number;
  status: 'firing' | 'resolved';
  metadata?: Record<string, any>;
}

export interface DashboardConfig {
  refreshIntervalMs?: number;
  retentionPeriodMs?: number;
  alertCheckIntervalMs?: number;
  maxDataPoints?: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<DashboardConfig> = {
  refreshIntervalMs: 5000,
  retentionPeriodMs: 24 * 60 * 60 * 1000, // 24 hours
  alertCheckIntervalMs: 10000,
  maxDataPoints: 1000,
};

// ─── Metrics Registry ───────────────────────────────────────────────────────────

class MetricsRegistry {
  private metrics: Map<string, Metric> = new Map();
  private readonly maxPoints: number;

  constructor(maxPoints: number = DEFAULT_CONFIG.maxDataPoints) {
    this.maxPoints = maxPoints;
  }

  register(name: string, type: Metric['type'], description: string, unit: string = ''): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, {
        name,
        type,
        description,
        points: [],
        unit,
      });
    }
  }

  record(name: string, value: number, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric) {
      throw new Error(`Metric ${name} not registered`);
    }

    const point: MetricPoint = {
      timestamp: Date.now(),
      value,
      labels,
    };

    metric.points.push(point);

    // Trim old points
    if (metric.points.length > this.maxPoints) {
      metric.points = metric.points.slice(-this.maxPoints);
    }
  }

  increment(name: string, labels?: Record<string, string>): void {
    const metric = this.metrics.get(name);
    if (!metric || metric.type !== 'counter') {
      throw new Error(`Counter ${name} not found`);
    }

    const currentValue = metric.points.length > 0 
      ? metric.points[metric.points.length - 1].value 
      : 0;

    this.record(name, currentValue + 1, labels);
  }

  get(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  getAll(): Map<string, Metric> {
    return new Map(this.metrics);
  }

  getRange(name: string, startTime: number, endTime: number): MetricPoint[] {
    const metric = this.metrics.get(name);
    if (!metric) return [];

    return metric.points.filter(
      point => point.timestamp >= startTime && point.timestamp <= endTime
    );
  }

  clear(): void {
    this.metrics.clear();
  }
}

// ─── Health Check System ────────────────────────────────────────────────────────

class HealthChecker {
  private checks: Map<string, HealthCheck> = new Map();
  private emitter: EventEmitter = new EventEmitter();

  async registerCheck(
    name: string,
    checkFn: () => Promise<{ status: HealthCheck['status']; latency: number; details?: any }>
  ): Promise<void> {
    const start = Date.now();
    
    try {
      const result = await checkFn();
      const latency = Date.now() - start;

      const healthCheck: HealthCheck = {
        name,
        status: result.status,
        latency,
        lastCheck: Date.now(),
        details: result.details,
      };

      this.checks.set(name, healthCheck);
      this.emitter.emit('health-change', healthCheck);
    } catch (error) {
      const latency = Date.now() - start;
      
      const healthCheck: HealthCheck = {
        name,
        status: 'unhealthy',
        latency,
        lastCheck: Date.now(),
        details: { error: (error as Error).message },
      };

      this.checks.set(name, healthCheck);
      this.emitter.emit('health-change', healthCheck);
    }
  }

  getStatus(name: string): HealthCheck | null {
    return this.checks.get(name) || null;
  }

  getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Array.from(this.checks.values()).map(c => c.status);
    
    if (statuses.every(s => s === 'healthy')) return 'healthy';
    if (statuses.some(s => s === 'unhealthy')) return 'unhealthy';
    return 'degraded';
  }

  getAllStatuses(): Map<string, HealthCheck> {
    return new Map(this.checks);
  }

  onHealthChange(callback: (health: HealthCheck) => void): void {
    this.emitter.on('health-change', callback);
  }
}

// ─── Alert Manager ──────────────────────────────────────────────────────────────

class AlertManager {
  private rules: AlertRule[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private emitter: EventEmitter = new EventEmitter();
  private metricValues: Map<string, number[]> = new Map();

  addRule(rule: AlertRule): void {
    this.rules.push(rule);
    this.metricValues.set(rule.metric, []);
  }

  removeRule(ruleName: string): void {
    this.rules = this.rules.filter(r => r.name !== ruleName);
  }

  updateMetric(metricName: string, value: number): void {
    const values = this.metricValues.get(metricName) || [];
    values.push(value);
    
    // Keep last 100 values
    if (values.length > 100) {
      values.shift();
    }
    
    this.metricValues.set(metricName, values);
    this.checkRules(metricName, value);
  }

  private checkRules(metricName: string, currentValue: number): void {
    for (const rule of this.rules) {
      if (rule.metric !== metricName) continue;

      const conditionMet = this.evaluateCondition(
        rule.condition,
        currentValue,
        rule.threshold
      );

      if (conditionMet) {
        this.triggerAlert(rule, currentValue);
      } else {
        this.resolveAlert(rule.name);
      }
    }
  }

  private evaluateCondition(
    condition: AlertRule['condition'],
    value: number,
    threshold: number
  ): boolean {
    switch (condition) {
      case 'gt': return value > threshold;
      case 'lt': return value < threshold;
      case 'eq': return value === threshold;
      case 'gte': return value >= threshold;
      case 'lte': return value <= threshold;
    }
  }

  private triggerAlert(rule: AlertRule, value: number): void {
    const existingAlert = this.activeAlerts.get(rule.name);
    
    if (existingAlert) {
      // Already firing, skip
      return;
    }

    const alert: Alert = {
      id: `alert-${rule.name}-${Date.now()}`,
      ruleName: rule.name,
      severity: rule.severity,
      message: `${rule.message} (Current: ${value})`,
      triggeredAt: Date.now(),
      status: 'firing',
      metadata: {
        metric: rule.metric,
        value,
        threshold: rule.threshold,
      },
    };

    this.activeAlerts.set(rule.name, alert);
    this.emitter.emit('alert-firing', alert);

    console.log(`🚨 ALERT [${rule.severity.toUpperCase()}]: ${alert.message}`);
  }

  private resolveAlert(ruleName: string): void {
    const alert = this.activeAlerts.get(ruleName);
    
    if (!alert || alert.status === 'resolved') return;

    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    this.emitter.emit('alert-resolved', alert);

    console.log(`✅ RESOLVED: ${alert.ruleName}`);
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(a => a.status === 'firing');
  }

  getAlertHistory(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  onAlertFiring(callback: (alert: Alert) => void): void {
    this.emitter.on('alert-firing', callback);
  }

  onAlertResolved(callback: (alert: Alert) => void): void {
    this.emitter.on('alert-resolved', callback);
  }
}

// ─── Main Monitoring Service ────────────────────────────────────────────────────

export class MonitoringService {
  private metrics: MetricsRegistry;
  private healthChecker: HealthChecker;
  private alertManager: AlertManager;
  private config: Required<DashboardConfig>;
  private intervals: NodeJS.Timeout[] = [];

  constructor(config: DashboardConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = new MetricsRegistry(this.config.maxDataPoints);
    this.healthChecker = new HealthChecker();
    this.alertManager = new AlertManager();

    this.setupSystemMetrics();
    this.startAutoCleanup();
  }

  /**
   * Register and record a metric
   */
  metric(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.metrics.get(name)) {
      this.metrics.register(name, 'gauge', `Custom metric: ${name}`);
    }
    this.metrics.record(name, value, labels);
    this.alertManager.updateMetric(name, value);
  }

  /**
   * Increment a counter
   */
  increment(name: string, labels?: Record<string, string>): void {
    if (!this.metrics.get(name)) {
      this.metrics.register(name, 'counter', `Counter: ${name}`);
    }
    this.metrics.increment(name, labels);
  }

  /**
   * Record histogram data
   */
  histogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.metrics.get(name)) {
      this.metrics.register(name, 'histogram', `Histogram: ${name}`, 'ms');
    }
    this.metrics.record(name, value, labels);
  }

  /**
   * Get metric data
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, Metric> {
    return this.metrics.getAll();
  }

  /**
   * Register health check
   */
  async healthCheck(
    name: string,
    checkFn: () => Promise<{ status: HealthCheck['status']; latency: number; details?: any }>
  ): Promise<void> {
    await this.healthChecker.registerCheck(name, checkFn);
  }

  /**
   * Get health status
   */
  getHealthStatus(name?: string): HealthCheck | Map<string, HealthCheck> | null {
    if (name) {
      return this.healthChecker.getStatus(name);
    }
    return this.healthChecker.getAllStatuses();
  }

  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    return this.healthChecker.getOverallStatus();
  }

  /**
   * Add alert rule
   */
  addAlert(rule: AlertRule): void {
    this.alertManager.addRule(rule);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alertManager.getActiveAlerts();
  }

  /**
   * Get dashboard data
   */
  getDashboardData(): {
    timestamp: number;
    overallHealth: 'healthy' | 'degraded' | 'unhealthy';
    metrics: Record<string, any>;
    healthChecks: Record<string, HealthCheck>;
    activeAlerts: Alert[];
  } {
    const metricsData: Record<string, any> = {};
    
    for (const [name, metric] of this.metrics.getAll()) {
      const latestPoint = metric.points[metric.points.length - 1];
      metricsData[name] = {
        value: latestPoint?.value || 0,
        change: this.calculateChange(metric.points),
        unit: metric.unit,
      };
    }

    const healthChecksData: Record<string, HealthCheck> = {};
    for (const [name, check] of this.healthChecker.getAllStatuses()) {
      healthChecksData[name] = check;
    }

    return {
      timestamp: Date.now(),
      overallHealth: this.getOverallHealth(),
      metrics: metricsData,
      healthChecks: healthChecksData,
      activeAlerts: this.alertManager.getActiveAlerts(),
    };
  }

  /**
   * Subscribe to metric updates
   */
  onMetricUpdate(callback: (metric: Metric) => void): void {
    // Implementation would use event emitter
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: (alert: Alert) => void): void {
    this.alertManager.onAlertFiring(callback);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.metrics.clear();
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private setupSystemMetrics(): void {
    // Register system metrics
    this.metrics.register('uptime', 'gauge', 'System uptime', 'seconds');
    this.metrics.register('memory_usage', 'gauge', 'Memory usage', 'MB');
    this.metrics.register('cpu_usage', 'gauge', 'CPU usage', 'percent');
    this.metrics.register('request_count', 'counter', 'Total requests', 'requests');
    this.metrics.register('error_count', 'counter', 'Total errors', 'errors');
    this.metrics.register('response_time', 'histogram', 'Response time', 'ms');

    // Auto-collect system metrics
    const systemInterval = setInterval(() => {
      this.metrics.record('uptime', process.uptime());
      const memUsage = process.memoryUsage();
      this.metrics.record('memory_usage', memUsage.heapUsed / 1024 / 1024);
    }, this.config.refreshIntervalMs);

    this.intervals.push(systemInterval);
  }

  private startAutoCleanup(): void {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      const cutoff = now - this.config.retentionPeriodMs;

      for (const metric of this.metrics.getAll().values()) {
        metric.points = metric.points.filter(p => p.timestamp >= cutoff);
      }
    }, 60 * 1000); // Run every minute

    this.intervals.push(cleanupInterval);
  }

  private calculateChange(points: MetricPoint[]): number {
    if (points.length < 2) return 0;
    
    const latest = points[points.length - 1].value;
    const previous = points[points.length - 2].value;
    
    if (previous === 0) return latest > 0 ? 100 : 0;
    
    return ((latest - previous) / previous) * 100;
  }
}

// ─── Default Export ─────────────────────────────────────────────────────────────

export const monitoringService = new MonitoringService();
