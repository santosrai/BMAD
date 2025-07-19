import React from 'react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { usePerformanceMonitoring } from '../../hooks/useAdvancedFeatures';
import { Activity, Cpu, HardDrive, Wifi, Users } from 'lucide-react';

export function PerformanceDashboard() {
  const { metrics, isMonitoring, startMonitoring, stopMonitoring } = usePerformanceMonitoring();

  React.useEffect(() => {
    const cleanup = startMonitoring();
    return cleanup;
  }, [startMonitoring]);

  const getStatusColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="flex items-center gap-2">
          <Badge variant={isMonitoring ? 'default' : 'secondary'}>
            {isMonitoring ? 'Live' : 'Paused'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={isMonitoring ? stopMonitoring : startMonitoring}
          >
            {isMonitoring ? 'Pause' : 'Start'} Monitoring
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Usage */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              <span className="font-medium">CPU</span>
            </div>
            <Badge variant="outline">{metrics.cpu.cores} cores</Badge>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Usage</span>
              <span className={`text-sm font-medium ${getStatusColor(metrics.cpu.usage, { warning: 70, critical: 90 })}`}>
                {metrics.cpu.usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.cpu.usage}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Memory Usage */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="h-5 w-5 text-green-500" />
            <span className="font-medium">Memory</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Used</span>
              <span className={`text-sm font-medium ${getStatusColor(metrics.memory.percentage, { warning: 80, critical: 95 })}`}>
                {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${metrics.memory.percentage}%` }}
              />
            </div>
          </div>
        </Card>

        {/* Network */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wifi className="h-5 w-5 text-purple-500" />
            <span className="font-medium">Network</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Download</span>
              <span className="text-sm font-medium">{metrics.network.downloadSpeed.toFixed(1)} Mbps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Upload</span>
              <span className="text-sm font-medium">{metrics.network.uploadSpeed.toFixed(1)} Mbps</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Latency</span>
              <span className="text-sm font-medium">{metrics.network.latency.toFixed(0)} ms</span>
            </div>
          </div>
        </Card>

        {/* Application Stats */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-orange-500" />
            <span className="font-medium">Application</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Active Users</span>
              <span className="text-sm font-medium">{metrics.application.activeUsers}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Sessions</span>
              <span className="text-sm font-medium">{metrics.application.sessionsCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Messages</span>
              <span className="text-sm font-medium">{metrics.application.messagesCount}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Performance Recommendations */}
      <Card className="p-4">
        <h3 className="font-medium mb-3">Performance Recommendations</h3>
        <div className="space-y-2">
          {metrics.cpu.usage > 80 && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <Activity className="h-4 w-4 text-yellow-600" />
              <span className="text-sm">High CPU usage detected. Consider closing unnecessary applications.</span>
            </div>
          )}
          {metrics.memory.percentage > 90 && (
            <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded">
              <HardDrive className="h-4 w-4 text-red-600" />
              <span className="text-sm">Memory usage is critical. Consider freeing up memory.</span>
            </div>
          )}
          {metrics.network.latency > 200 && (
            <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
              <Wifi className="h-4 w-4 text-orange-600" />
              <span className="text-sm">High network latency detected. Check your internet connection.</span>
            </div>
          )}
          {metrics.cpu.usage < 30 && metrics.memory.percentage < 50 && (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded">
              <Activity className="h-4 w-4 text-green-600" />
              <span className="text-sm">System performance is optimal.</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}