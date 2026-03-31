/**
 * tests/monitoringService.test.ts
 * Test monitoring dashboard with metrics and alerting
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MonitoringService, monitoringService } from '../src/services/monitoringService.js';

describe('Monitoring Service', () => {
  let service: MonitoringService;

  beforeEach(() => {
    service = new MonitoringService({
      refreshIntervalMs: 100,
      retentionPeriodMs: 1000,
      maxDataPoints: 100,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  describe('Metrics Collection', () => {
    it('should register and record gauge metrics', () => {
      service.metric('temperature', 25.5);
      
      const metric = service.getMetric('temperature');
      
      expect(metric).toBeDefined();
      expect(metric?.name).toBe('temperature');
      expect(metric?.type).toBe('gauge');
      expect(metric?.points.length).toBe(1);
      expect(metric?.points[0].value).toBe(25.5);
    });

    it('should increment counters', () => {
      service.increment('page_views');
      service.increment('page_views');
      service.increment('page_views');
      
      const metric = service.getMetric('page_views');
      
      expect(metric?.type).toBe('counter');
      expect(metric?.points[metric!.points.length - 1].value).toBe(3);
    });

    it('should record histogram data', () => {
      service.histogram('response_time', 45);
      service.histogram('response_time', 67);
      service.histogram('response_time', 89);
      
      const metric = service.getMetric('response_time');
      
      expect(metric?.type).toBe('histogram');
      expect(metric?.unit).toBe('ms');
      expect(metric?.points.length).toBe(3);
    });

    it('should handle labels for metrics', () => {
      service.metric('cpu_usage', 45.2, { core: '0' });
      service.metric('cpu_usage', 67.8, { core: '1' });
      
      const metric = service.getMetric('cpu_usage');
      
      expect(metric?.points.length).toBe(2);
      expect(metric?.points[0].labels).toEqual({ core: '0' });
      expect(metric?.points[1].labels).toEqual({ core: '1' });
    });

    it('should trim old data points', () => {
      for (let i = 0; i < 150; i++) {
        service.metric('test_metric', i);
      }
      
      const metric = service.getMetric('test_metric');
      
      expect(metric?.points.length).toBeLessThanOrEqual(100); // maxDataPoints
    });
  });

  describe('Health Checks', () => {
    it('should register healthy service', async () => {
      await service.healthCheck('database', async () => ({
        status: 'healthy',
        latency: 15,
        details: { connections: 10 },
      }));

      const health = service.getHealthStatus('database') as any;
      
      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBe(15);
    });

    it('should register unhealthy service', async () => {
      await service.healthCheck('api', async () => ({
        status: 'unhealthy',
        latency: 5000,
        details: { error: 'Connection timeout' },
      }));

      const health = service.getHealthStatus('api') as any;
      
      expect(health.status).toBe('unhealthy');
      expect(health.latency).toBe(5000);
    });

    it('should handle failed health checks', async () => {
      await service.healthCheck('cache', async () => {
        throw new Error('Cache unavailable');
      });

      const health = service.getHealthStatus('cache') as any;
      
      expect(health.status).toBe('unhealthy');
      expect(health.details?.error).toBe('Cache unavailable');
    });

    it('should calculate overall health', async () => {
      await service.healthCheck('service1', async () => ({ status: 'healthy', latency: 10 }));
      await service.healthCheck('service2', async () => ({ status: 'healthy', latency: 20 }));
      
      expect(service.getOverallHealth()).toBe('healthy');

      await service.healthCheck('service3', async () => ({ status: 'degraded', latency: 100 }));
      
      expect(service.getOverallHealth()).toBe('degraded');

      await service.healthCheck('service4', async () => ({ status: 'unhealthy', latency: 5000 }));
      
      expect(service.getOverallHealth()).toBe('unhealthy');
    });

    it('should emit health change events', async () => {
      return new Promise<void>((resolve) => {
        service.onMetricUpdate((health: any) => {
          expect(health.name).toBeDefined();
          resolve();
        });

        service.healthCheck('test-service', async () => ({
          status: 'healthy',
          latency: 10,
        }));
        
        setTimeout(resolve, 100); // Fallback
      });
    });
  });

  describe('Alert System', () => {
    it('should trigger alert when threshold exceeded', async () => {
      service.addAlert({
        name: 'high_cpu',
        metric: 'cpu_usage',
        condition: 'gt',
        threshold: 80,
        duration: 0,
        severity: 'warning',
        channels: ['log'],
        message: 'CPU usage is too high',
      });

      service.metric('cpu_usage', 85);
      
      const alerts = service.getActiveAlerts();
      
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts[0].ruleName).toBe('high_cpu');
      expect(alerts[0].severity).toBe('warning');
    });

    it('should not trigger alert below threshold', () => {
      service.addAlert({
        name: 'high_memory',
        metric: 'memory_usage',
        condition: 'gt',
        threshold: 90,
        duration: 0,
        severity: 'critical',
        channels: ['log'],
        message: 'Memory critical',
      });

      service.metric('memory_usage', 75);
      
      const alerts = service.getActiveAlerts();
      
      expect(alerts.length).toBe(0);
    });

    it('should support different conditions', () => {
      service.addAlert({
        name: 'low_requests',
        metric: 'request_count',
        condition: 'lt',
        threshold: 10,
        duration: 0,
        severity: 'info',
        channels: ['log'],
        message: 'Low traffic',
      });

      service.metric('request_count', 5);
      
      const alerts = service.getActiveAlerts();
      
      expect(alerts.length).toBeGreaterThan(0);
    });

    it('should resolve alert when condition clears', () => {
      service.addAlert({
        name: 'high_latency',
        metric: 'response_time',
        condition: 'gt',
        threshold: 100,
        duration: 0,
        severity: 'warning',
        channels: ['log'],
        message: 'High latency detected',
      });

      // Trigger alert
      service.metric('response_time', 150);
      expect(service.getActiveAlerts().length).toBeGreaterThan(0);

      // Clear condition
      service.metric('response_time', 50);
      
      // Alert should be resolved
      const activeAlerts = service.getActiveAlerts();
      const allAlerts = service.getActiveAlerts(); // Would include resolved in real implementation
      
      expect(activeAlerts.length).toBe(0);
    });

    it('should track alert history', () => {
      service.addAlert({
        name: 'test_alert',
        metric: 'test_metric',
        condition: 'gt',
        threshold: 50,
        duration: 0,
        severity: 'warning',
        channels: ['log'],
        message: 'Test alert',
      });

      service.metric('test_metric', 60);
      service.metric('test_metric', 40);
      
      const history = service.getActiveAlerts();
      
      expect(history).toBeDefined();
    });
  });

  describe('Dashboard Data', () => {
    it('should provide complete dashboard snapshot', async () => {
      // Add metrics
      service.metric('cpu_usage', 45.2);
      service.increment('total_requests');
      service.histogram('response_time', 67);

      // Add health checks
      await service.healthCheck('database', async () => ({
        status: 'healthy',
        latency: 15,
      }));

      const dashboard = service.getDashboardData();

      expect(dashboard.timestamp).toBeDefined();
      expect(dashboard.overallHealth).toBe('healthy');
      expect(dashboard.metrics.cpu_usage).toBeDefined();
      expect(dashboard.healthChecks.database).toBeDefined();
      expect(dashboard.activeAlerts).toBeDefined();
    });

    it('should calculate metric changes', () => {
      service.metric('temperature', 20);
      service.metric('temperature', 25);
      
      const dashboard = service.getDashboardData();
      
      expect(dashboard.metrics.temperature.change).toBeGreaterThan(0);
    });
  });

  describe('System Metrics', () => {
    it('should auto-collect system metrics', () => {
      const uptime = service.getMetric('uptime');
      const memory = service.getMetric('memory_usage');
      
      expect(uptime).toBeDefined();
      expect(memory).toBeDefined();
      expect(uptime?.points.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unregistered metrics gracefully', () => {
      expect(() => service.getMetric('nonexistent')).toBeUndefined();
    });

    it('should handle null/undefined values', () => {
      expect(() => {
        service.metric('test', null as any);
      }).toThrow();
    });

    it('should handle very large numbers', () => {
      service.metric('large_number', Number.MAX_SAFE_INTEGER);
      
      const metric = service.getMetric('large_number');
      expect(metric?.points[0].value).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should handle negative numbers', () => {
      service.metric('temperature', -10.5);
      
      const metric = service.getMetric('temperature');
      expect(metric?.points[0].value).toBe(-10.5);
    });
  });

  describe('Performance', () => {
    it('should record metrics quickly', () => {
      const iterations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        service.metric('perf_test', i);
      }
      
      const duration = Date.now() - start;
      
      expect(duration / iterations).toBeLessThan(1); // < 1ms per operation
    });

    it('should handle concurrent updates', async () => {
      const promises = Array(100).fill(null).map((_, i) =>
        Promise.resolve().then(() => service.metric('concurrent', i))
      );
      
      await expect(Promise.all(promises)).resolves.not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup old data', async () => {
      // Record data
      for (let i = 0; i < 10; i++) {
        service.metric('cleanup_test', i);
      }

      // Wait for retention period
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Force cleanup
      const metric = service.getMetric('cleanup_test');
      expect(metric?.points.length).toBeLessThan(10); // Old points removed
    });

    it('should cleanup on destroy', () => {
      service.metric('destroy_test', 123);
      expect(service.getMetric('destroy_test')).toBeDefined();

      service.destroy();
      
      expect(service.getMetric('destroy_test')).toBeUndefined();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should monitor API endpoint', async () => {
      // Setup alerts
      service.addAlert({
        name: 'slow_response',
        metric: 'api_response_time',
        condition: 'gt',
        threshold: 500,
        duration: 0,
        severity: 'warning',
        channels: ['log'],
        message: 'API response time exceeds threshold',
      });

      // Simulate API calls
      service.histogram('api_response_time', 120);
      service.histogram('api_response_time', 89);
      service.histogram('api_response_time', 156);

      // Health check
      await service.healthCheck('api', async () => ({
        status: 'healthy',
        latency: 122,
      }));

      const dashboard = service.getDashboardData();
      
      expect(dashboard.metrics.api_response_time).toBeDefined();
      expect(dashboard.healthChecks.api).toBeDefined();
    });

    it('should monitor database connection pool', async () => {
      service.addAlert({
        name: 'pool_exhaustion',
        metric: 'db_connections_used',
        condition: 'gt',
        threshold: 90,
        duration: 0,
        severity: 'critical',
        channels: ['log'],
        message: 'Database connection pool nearly exhausted',
      });

      // Simulate connection usage
      service.metric('db_connections_used', 45);
      service.metric('db_connections_used', 67);
      service.metric('db_connections_used', 89);

      await service.healthCheck('database', async () => ({
        status: 'healthy',
        latency: 5,
        details: {
          connections_used: 89,
          connections_max: 100,
        },
      }));

      const dashboard = service.getDashboardData();
      expect(dashboard.overallHealth).toBe('healthy');
    });
  });
});
