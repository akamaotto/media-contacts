/**
 * System Resource Monitoring System
 * Monitors CPU, memory, disk, network, and other system resources
 */

export interface SystemMetrics {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: {
      one: number;
      five: number;
      fifteen: number;
    };
    cores: number;
    processes: {
      total: number;
      running: number;
      sleeping: number;
    };
  };
  memory: {
    total: number;
    used: number;
    free: number;
    cached: number;
    buffers: number;
    swap: {
      total: number;
      used: number;
      free: number;
    };
    usage: number; // percentage
  };
  disk: {
    usage: Array<{
      filesystem: string;
      size: number;
      used: number;
      available: number;
      usage: number; // percentage
      mountpoint: string;
    }>;
    io: {
      readBytes: number;
      writeBytes: number;
      readOps: number;
      writeOps: number;
      readTime: number;
      writeTime: number;
    };
  };
  network: {
    interfaces: Array<{
      name: string;
      bytesReceived: number;
      bytesSent: number;
      packetsReceived: number;
      packetsSent: number;
      errorsIn: number;
      errorsOut: number;
      dropsIn: number;
      dropsOut: number;
    }>;
    connections: {
      total: number;
      established: number;
      listening: number;
      timeWait: number;
    };
  };
  temperature: {
    cpu: number;
    gpu?: number;
    sensors: Array<{
      name: string;
      temperature: number;
      unit: string;
    }>;
  };
  uptime: number;
  processes: Array<{
    pid: number;
    name: string;
    cpu: number;
    memory: number;
    status: string;
  }>;
}

export interface ResourceAlert {
  id: string;
  type: 'cpu' | 'memory' | 'disk' | 'network' | 'temperature' | 'process';
  severity: 'info' | 'warning' | 'critical' | 'emergency';
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: Date;
  recommendations: string[];
}

export interface ResourceThresholds {
  cpu: {
    warningUsage: number; // percentage
    criticalUsage: number; // percentage
    maxLoadAverage: number;
  };
  memory: {
    warningUsage: number; // percentage
    criticalUsage: number; // percentage
    maxSwapUsage: number; // percentage
  };
  disk: {
    warningUsage: number; // percentage
    criticalUsage: number; // percentage
    minFreeSpace: number; // GB
  };
  network: {
    maxErrorRate: number; // percentage
    maxDropRate: number; // percentage
    maxConnections: number;
  };
  temperature: {
    warningCpuTemp: number; // Celsius
    criticalCpuTemp: number; // Celsius
    warningGpuTemp?: number; // Celsius
    criticalGpuTemp?: number; // Celsius
  };
}

/**
 * System Resource Monitor Class
 */
export class SystemResourceMonitor {
  private static instance: SystemResourceMonitor;
  private metrics: SystemMetrics;
  private thresholds: ResourceThresholds;
  private alerts: ResourceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsHistory: SystemMetrics[] = [];
  private maxHistorySize = 1000;

  private constructor() {
    this.metrics = this.initializeMetrics();
    this.thresholds = this.initializeThresholds();
    this.startMonitoring();
  }

  static getInstance(): SystemResourceMonitor {
    if (!SystemResourceMonitor.instance) {
      SystemResourceMonitor.instance = new SystemResourceMonitor();
    }
    return SystemResourceMonitor.instance;
  }

  /**
   * Initialize default metrics
   */
  private initializeMetrics(): SystemMetrics {
    return {
      timestamp: new Date(),
      cpu: {
        usage: 0,
        loadAverage: { one: 0, five: 0, fifteen: 0 },
        cores: 1,
        processes: { total: 0, running: 0, sleeping: 0 }
      },
      memory: {
        total: 0,
        used: 0,
        free: 0,
        cached: 0,
        buffers: 0,
        swap: { total: 0, used: 0, free: 0 },
        usage: 0
      },
      disk: {
        usage: [],
        io: {
          readBytes: 0,
          writeBytes: 0,
          readOps: 0,
          writeOps: 0,
          readTime: 0,
          writeTime: 0
        }
      },
      network: {
        interfaces: [],
        connections: {
          total: 0,
          established: 0,
          listening: 0,
          timeWait: 0
        }
      },
      temperature: {
        cpu: 0,
        sensors: []
      },
      uptime: 0,
      processes: []
    };
  }

  /**
   * Initialize default thresholds
   */
  private initializeThresholds(): ResourceThresholds {
    return {
      cpu: {
        warningUsage: 70,
        criticalUsage: 90,
        maxLoadAverage: 2.0
      },
      memory: {
        warningUsage: 75,
        criticalUsage: 90,
        maxSwapUsage: 50
      },
      disk: {
        warningUsage: 80,
        criticalUsage: 95,
        minFreeSpace: 5 // GB
      },
      network: {
        maxErrorRate: 1,
        maxDropRate: 0.5,
        maxConnections: 10000
      },
      temperature: {
        warningCpuTemp: 70,
        criticalCpuTemp: 85,
        warningGpuTemp: 75,
        criticalGpuTemp: 90
      }
    };
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.updateMetrics();
        this.checkAlerts();
        this.storeMetrics();
      } catch (error) {
        console.error('System resource monitoring error:', error);
      }
    }, 30000); // Every 30 seconds

    console.log('✅ [SYSTEM-RESOURCE-MONITOR] System resource monitoring started');
  }

  /**
   * Update all system metrics
   */
  private async updateMetrics(): Promise<void> {
    this.metrics.timestamp = new Date();
    
    await Promise.all([
      this.updateCpuMetrics(),
      this.updateMemoryMetrics(),
      this.updateDiskMetrics(),
      this.updateNetworkMetrics(),
      this.updateTemperatureMetrics(),
      this.updateProcessMetrics()
    ]);

    // Update uptime
    this.metrics.uptime = await this.getUptime();
  }

  /**
   * Update CPU metrics
   */
  private async updateCpuMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // Get CPU usage
        try {
          const { stdout } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | sed 's/%us,//'");
          this.metrics.cpu.usage = parseFloat(stdout.trim()) || 0;
        } catch (error) {
          // Fallback method
          const { stdout } = await execAsync("grep 'cpu ' /proc/stat | awk '{usage=($2+$4)*100/($2+$4+$5)} END {print usage}'");
          this.metrics.cpu.usage = parseFloat(stdout.trim()) || 0;
        }

        // Get load average
        try {
          const { stdout } = await execAsync("cat /proc/loadavg");
          const [one, five, fifteen] = stdout.trim().split(' ').map(parseFloat);
          this.metrics.cpu.loadAverage = { one, five, fifteen };
        } catch (error) {
          // Fallback to uptime command
          const { stdout } = await execAsync("uptime");
          const loadMatch = stdout.match(/load average: ([\d.]+), ([\d.]+), ([\d.]+)/);
          if (loadMatch) {
            this.metrics.cpu.loadAverage = {
              one: parseFloat(loadMatch[1]),
              five: parseFloat(loadMatch[2]),
              fifteen: parseFloat(loadMatch[3])
            };
          }
        }

        // Get CPU cores
        try {
          const { stdout } = await execAsync("nproc");
          this.metrics.cpu.cores = parseInt(stdout.trim()) || 1;
        } catch (error) {
          this.metrics.cpu.cores = 1;
        }

        // Get process counts
        try {
          const { stdout } = await execAsync("ps aux | awk '{print $8}' | sort | uniq -c");
          const lines = stdout.trim().split('\n');
          this.metrics.cpu.processes = { total: 0, running: 0, sleeping: 0 };
          
          lines.forEach(line => {
            const [count, status] = line.trim().split(/\s+/);
            const countNum = parseInt(count) || 0;
            this.metrics.cpu.processes.total += countNum;
            
            if (status === 'R') {
              this.metrics.cpu.processes.running += countNum;
            } else if (status === 'S') {
              this.metrics.cpu.processes.sleeping += countNum;
            }
          });
        } catch (error) {
          this.metrics.cpu.processes = { total: 0, running: 0, sleeping: 0 };
        }
      }
    } catch (error) {
      console.error('Error updating CPU metrics:', error);
    }
  }

  /**
   * Update memory metrics
   */
  private async updateMemoryMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // Get memory info from /proc/meminfo
        try {
          const { stdout } = await execAsync("cat /proc/meminfo");
          const lines = stdout.trim().split('\n');
          const memInfo: Record<string, number> = {};
          
          lines.forEach(line => {
            const match = line.match(/^(.+):\s+(\d+)\s+kB$/);
            if (match) {
              memInfo[match[1]] = parseInt(match[2]) * 1024; // Convert to bytes
            }
          });

          this.metrics.memory.total = memInfo.MemTotal || 0;
          this.metrics.memory.used = (memInfo.MemTotal || 0) - (memInfo.MemAvailable || 0);
          this.metrics.memory.free = memInfo.MemAvailable || 0;
          this.metrics.memory.cached = memInfo.Cached || 0;
          this.metrics.memory.buffers = memInfo.Buffers || 0;
          this.metrics.memory.usage = this.metrics.memory.total > 0 
            ? (this.metrics.memory.used / this.metrics.memory.total) * 100 
            : 0;

          // Swap memory
          this.metrics.memory.swap.total = memInfo.SwapTotal || 0;
          this.metrics.memory.swap.used = memInfo.SwapTotal - (memInfo.SwapFree || 0);
          this.metrics.memory.swap.free = memInfo.SwapFree || 0;
        } catch (error) {
          // Fallback to free command
          const { stdout } = await execAsync("free -b | grep '^Mem:'");
          const parts = stdout.trim().split(/\s+/);
          if (parts.length >= 7) {
            this.metrics.memory.total = parseInt(parts[1]);
            this.metrics.memory.used = parseInt(parts[2]);
            this.metrics.memory.free = parseInt(parts[3]);
            this.metrics.memory.cached = parseInt(parts[5]);
            this.metrics.memory.buffers = parseInt(parts[6]);
            this.metrics.memory.usage = (this.metrics.memory.used / this.metrics.memory.total) * 100;
          }
        }
      }
    } catch (error) {
      console.error('Error updating memory metrics:', error);
    }
  }

  /**
   * Update disk metrics
   */
  private async updateDiskMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // Get disk usage
        const { stdout } = await execAsync("df -h | grep -E '^/dev/'");
        const lines = stdout.trim().split('\n');
        
        this.metrics.disk.usage = lines.map(line => {
          const parts = line.split(/\s+/);
          return {
            filesystem: parts[0],
            size: this.parseSize(parts[1]),
            used: this.parseSize(parts[2]),
            available: this.parseSize(parts[3]),
            usage: parseFloat(parts[4].replace('%', '')),
            mountpoint: parts[5]
          };
        });

        // Get disk I/O stats
        try {
          const { stdout } = await execAsync("iostat -dx 1 1 | tail -n +4");
          const lines = stdout.trim().split('\n');
          
          let totalReadBytes = 0;
          let totalWriteBytes = 0;
          let totalReadOps = 0;
          let totalWriteOps = 0;
          
          lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length >= 14) {
              totalReadOps += parseFloat(parts[3]);
              totalWriteOps += parseFloat(parts[4]);
              // Note: Actual I/O bytes would require parsing /proc/diskstats
            }
          });
          
          this.metrics.disk.io = {
            ...this.metrics.disk.io,
            readOps: totalReadOps,
            writeOps: totalWriteOps
          };
        } catch (error) {
          // I/O stats not available
        }
      }
    } catch (error) {
      console.error('Error updating disk metrics:', error);
    }
  }

  /**
   * Update network metrics
   */
  private async updateNetworkMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // Get network interface stats
        try {
          const { stdout } = await execAsync("cat /proc/net/dev | grep -v lo:");
          const lines = stdout.trim().split('\n');
          
          this.metrics.network.interfaces = lines.map(line => {
            const parts = line.trim().split(/:\s+|\s+/);
            const name = parts[0];
            return {
              name,
              bytesReceived: parseInt(parts[1]),
              bytesSent: parseInt(parts[9]),
              packetsReceived: parseInt(parts[2]),
              packetsSent: parseInt(parts[10]),
              errorsIn: parseInt(parts[3]),
              errorsOut: parseInt(parts[11]),
              dropsIn: parseInt(parts[4]),
              dropsOut: parseInt(parts[12])
            };
          });
        } catch (error) {
          this.metrics.network.interfaces = [];
        }

        // Get network connections
        try {
          const { stdout } = await execAsync("netstat -an | grep '^TCP' | wc -l");
          const totalConnections = parseInt(stdout.trim()) || 0;
          
          const { stdout: establishedOut } = await execAsync("netstat -an | grep '^TCP.*ESTABLISHED' | wc -l");
          const established = parseInt(establishedOut.trim()) || 0;
          
          const { stdout: listeningOut } = await execAsync("netstat -an | grep '^TCP.*LISTEN' | wc -l");
          const listening = parseInt(listeningOut.trim()) || 0;
          
          const { stdout: timeWaitOut } = await execAsync("netstat -an | grep '^TCP.*TIME_WAIT' | wc -l");
          const timeWait = parseInt(timeWaitOut.trim()) || 0;
          
          this.metrics.network.connections = {
            total: totalConnections,
            established,
            listening,
            timeWait
          };
        } catch (error) {
          this.metrics.network.connections = {
            total: 0,
            established: 0,
            listening: 0,
            timeWait: 0
          };
        }
      }
    } catch (error) {
      console.error('Error updating network metrics:', error);
    }
  }

  /**
   * Update temperature metrics
   */
  private async updateTemperatureMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // Get CPU temperature
        try {
          const { stdout } = await execAsync("sensors | grep 'Core 0' | awk '{print $3}' | sed 's/+//;s/°C//'");
          this.metrics.temperature.cpu = parseFloat(stdout.trim()) || 0;
        } catch (error) {
          // Try alternative methods
          try {
            const { stdout } = await execAsync("cat /sys/class/thermal/thermal_zone0/temp");
            this.metrics.temperature.cpu = parseInt(stdout.trim()) / 1000; // Convert from millidegrees
          } catch (error2) {
            this.metrics.temperature.cpu = 0;
          }
        }

        // Get other temperature sensors
        try {
          const { stdout } = await execAsync("sensors");
          const lines = stdout.trim().split('\n');
          const sensors: Array<{ name: string; temperature: number; unit: string }> = [];
          
          lines.forEach(line => {
            const match = line.match(/^(.+):\s+\+([\d.]+)\s+(.C|F)$/);
            if (match) {
              sensors.push({
                name: match[1],
                temperature: parseFloat(match[2]),
                unit: match[3]
              });
            }
          });
          
          this.metrics.temperature.sensors = sensors;
        } catch (error) {
          this.metrics.temperature.sensors = [];
        }
      }
    } catch (error) {
      console.error('Error updating temperature metrics:', error);
    }
  }

  /**
   * Update process metrics
   */
  private async updateProcessMetrics(): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // Get top processes by CPU and memory
        const { stdout } = await execAsync("ps aux --sort=-%cpu | head -11");
        const lines = stdout.trim().split('\n');
        
        this.metrics.processes = lines.slice(1).map(line => {
          const parts = line.trim().split(/\s+/);
          return {
            pid: parseInt(parts[1]),
            name: parts[10] || '',
            cpu: parseFloat(parts[2]),
            memory: parseFloat(parts[3]),
            status: parts[7] || ''
          };
        }).filter(p => p.pid > 0);
      }
    } catch (error) {
      console.error('Error updating process metrics:', error);
    }
  }

  /**
   * Get system uptime
   */
  private async getUptime(): Promise<number> {
    try {
      if (typeof window === 'undefined') {
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        const { stdout } = await execAsync("cat /proc/uptime");
        const uptimeSeconds = parseFloat(stdout.trim().split(' ')[0]);
        return uptimeSeconds * 1000; // Convert to milliseconds
      }
    } catch (error) {
      console.error('Error getting uptime:', error);
    }
    return 0;
  }

  /**
   * Parse size string to bytes
   */
  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      'K': 1024,
      'M': 1024 * 1024,
      'G': 1024 * 1024 * 1024,
      'T': 1024 * 1024 * 1024 * 1024
    };
    
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMG]?)$/);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2] || '';
    
    return value * (units[unit] || 1);
  }

  /**
   * Check for alert conditions
   */
  private checkAlerts(): void {
    const alerts: ResourceAlert[] = [];

    // CPU alerts
    if (this.metrics.cpu.usage > this.thresholds.cpu.criticalUsage) {
      alerts.push(this.createAlert(
        'cpu',
        'critical',
        'Critical CPU Usage',
        `CPU usage is ${this.metrics.cpu.usage.toFixed(1)}%`,
        'cpu_usage',
        this.metrics.cpu.usage,
        this.thresholds.cpu.criticalUsage,
        [
          'Identify and stop CPU-intensive processes',
          'Check for runaway processes',
          'Consider scaling up resources'
        ]
      ));
    } else if (this.metrics.cpu.usage > this.thresholds.cpu.warningUsage) {
      alerts.push(this.createAlert(
        'cpu',
        'warning',
        'High CPU Usage',
        `CPU usage is ${this.metrics.cpu.usage.toFixed(1)}%`,
        'cpu_usage',
        this.metrics.cpu.usage,
        this.thresholds.cpu.warningUsage,
        [
          'Monitor CPU usage trends',
          'Check for unusual processes',
          'Review recent system changes'
        ]
      ));
    }

    if (this.metrics.cpu.loadAverage.fifteen > this.thresholds.cpu.maxLoadAverage * this.metrics.cpu.cores) {
      alerts.push(this.createAlert(
        'cpu',
        'warning',
        'High Load Average',
        `15-minute load average is ${this.metrics.cpu.loadAverage.fifteen.toFixed(2)}`,
        'load_average',
        this.metrics.cpu.loadAverage.fifteen,
        this.thresholds.cpu.maxLoadAverage * this.metrics.cpu.cores,
        [
          'Check for long-running processes',
          'Monitor system performance',
          'Consider load balancing'
        ]
      ));
    }

    // Memory alerts
    if (this.metrics.memory.usage > this.thresholds.memory.criticalUsage) {
      alerts.push(this.createAlert(
        'memory',
        'critical',
        'Critical Memory Usage',
        `Memory usage is ${this.metrics.memory.usage.toFixed(1)}%`,
        'memory_usage',
        this.metrics.memory.usage,
        this.thresholds.memory.criticalUsage,
        [
          'Free up memory by stopping unnecessary processes',
          'Check for memory leaks',
          'Consider adding more RAM'
        ]
      ));
    } else if (this.metrics.memory.usage > this.thresholds.memory.warningUsage) {
      alerts.push(this.createAlert(
        'memory',
        'warning',
        'High Memory Usage',
        `Memory usage is ${this.metrics.memory.usage.toFixed(1)}%`,
        'memory_usage',
        this.metrics.memory.usage,
        this.thresholds.memory.warningUsage,
        [
          'Monitor memory usage trends',
          'Check for memory-intensive applications',
          'Review system performance'
        ]
      ));
    }

    // Swap usage alert
    if (this.metrics.memory.swap.total > 0) {
      const swapUsage = (this.metrics.memory.swap.used / this.metrics.memory.swap.total) * 100;
      if (swapUsage > this.thresholds.memory.maxSwapUsage) {
        alerts.push(this.createAlert(
          'memory',
          'warning',
          'High Swap Usage',
          `Swap usage is ${swapUsage.toFixed(1)}%`,
          'swap_usage',
          swapUsage,
          this.thresholds.memory.maxSwapUsage,
          [
            'Free up physical memory',
            'Check for memory leaks',
            'Consider optimizing memory usage'
          ]
        ));
      }
    }

    // Disk alerts
    this.metrics.disk.usage.forEach(disk => {
      if (disk.usage > this.thresholds.disk.criticalUsage) {
        alerts.push(this.createAlert(
          'disk',
          'critical',
          'Critical Disk Usage',
          `Disk ${disk.mountpoint} usage is ${disk.usage}%`,
          'disk_usage',
          disk.usage,
          this.thresholds.disk.criticalUsage,
          [
            'Free up disk space',
            'Archive or delete old files',
            'Consider expanding disk capacity'
          ]
        ));
      } else if (disk.usage > this.thresholds.disk.warningUsage) {
        alerts.push(this.createAlert(
          'disk',
          'warning',
          'High Disk Usage',
          `Disk ${disk.mountpoint} usage is ${disk.usage}%`,
          'disk_usage',
          disk.usage,
          this.thresholds.disk.warningUsage,
          [
            'Monitor disk usage trends',
            'Plan for disk space management',
            'Consider cleanup operations'
          ]
        ));
      }

      const freeSpaceGB = disk.available / (1024 * 1024 * 1024);
      if (freeSpaceGB < this.thresholds.disk.minFreeSpace) {
        alerts.push(this.createAlert(
          'disk',
          'critical',
          'Low Disk Space',
          `Disk ${disk.mountpoint} has only ${freeSpaceGB.toFixed(1)}GB free`,
          'free_space',
          freeSpaceGB,
          this.thresholds.disk.minFreeSpace,
          [
            'Immediately free up disk space',
            'Stop non-essential services',
            'Consider emergency cleanup'
          ]
        ));
      }
    });

    // Temperature alerts
    if (this.metrics.temperature.cpu > this.thresholds.temperature.criticalCpuTemp) {
      alerts.push(this.createAlert(
        'temperature',
        'critical',
        'Critical CPU Temperature',
        `CPU temperature is ${this.metrics.temperature.cpu.toFixed(1)}°C`,
        'cpu_temperature',
        this.metrics.temperature.cpu,
        this.thresholds.temperature.criticalCpuTemp,
        [
          'Check CPU cooling system',
          'Reduce CPU load',
          'Verify system fans are working'
        ]
      ));
    } else if (this.metrics.temperature.cpu > this.thresholds.temperature.warningCpuTemp) {
      alerts.push(this.createAlert(
        'temperature',
        'warning',
        'High CPU Temperature',
        `CPU temperature is ${this.metrics.temperature.cpu.toFixed(1)}°C`,
        'cpu_temperature',
        this.metrics.temperature.cpu,
        this.thresholds.temperature.warningCpuTemp,
        [
          'Monitor CPU temperature',
          'Check for dust accumulation',
          'Ensure proper ventilation'
        ]
      ));
    }

    // Network alerts
    this.metrics.network.interfaces.forEach(iface => {
      const totalPackets = iface.packetsReceived + iface.packetsSent;
      const totalErrors = iface.errorsIn + iface.errorsOut;
      const totalDrops = iface.dropsIn + iface.dropsOut;
      
      if (totalPackets > 0) {
        const errorRate = (totalErrors / totalPackets) * 100;
        if (errorRate > this.thresholds.network.maxErrorRate) {
          alerts.push(this.createAlert(
            'network',
            'warning',
            'High Network Error Rate',
            `Interface ${iface.name} error rate is ${errorRate.toFixed(2)}%`,
            'network_error_rate',
            errorRate,
            this.thresholds.network.maxErrorRate,
            [
              'Check network cable connection',
              'Verify network interface configuration',
              'Monitor network hardware'
            ]
          ));
        }

        const dropRate = (totalDrops / totalPackets) * 100;
        if (dropRate > this.thresholds.network.maxDropRate) {
          alerts.push(this.createAlert(
            'network',
            'warning',
            'High Network Drop Rate',
            `Interface ${iface.name} drop rate is ${dropRate.toFixed(2)}%`,
            'network_drop_rate',
            dropRate,
            this.thresholds.network.maxDropRate,
            [
              'Check for network congestion',
              'Verify network configuration',
              'Monitor network traffic'
            ]
          ));
        }
      }
    });

    // Add new alerts to the list
    alerts.forEach(alert => {
      // Check if similar alert already exists
      const existingAlert = this.alerts.find(a => 
        a.type === alert.type && 
        a.metric === alert.metric &&
        (Date.now() - a.timestamp.getTime()) < 5 * 60 * 1000 // 5 minutes
      );

      if (!existingAlert) {
        this.alerts.push(alert);
        console.log(`🚨 [SYSTEM-RESOURCE-MONITOR] Alert: ${alert.title}`);
      }
    });

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Create a resource alert
   */
  private createAlert(
    type: ResourceAlert['type'],
    severity: ResourceAlert['severity'],
    title: string,
    message: string,
    metric: string,
    value: number,
    threshold: number,
    recommendations: string[]
  ): ResourceAlert {
    return {
      id: `res_alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      metric,
      value,
      threshold,
      timestamp: new Date(),
      recommendations
    };
  }

  /**
   * Store metrics in history
   */
  private storeMetrics(): void {
    this.metricsHistory.push({ ...this.metrics });
    
    // Keep only last N metrics
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics(): SystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit?: number): SystemMetrics[] {
    const history = [...this.metricsHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Get current alerts
   */
  getAlerts(): ResourceAlert[] {
    return [...this.alerts];
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: ResourceAlert['severity']): ResourceAlert[] {
    return this.alerts.filter(alert => alert.severity === severity);
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: ResourceAlert['type']): ResourceAlert[] {
    return this.alerts.filter(alert => alert.type === type);
  }

  /**
   * Update thresholds
   */
  updateThresholds(newThresholds: Partial<ResourceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    console.log('📊 [SYSTEM-RESOURCE-MONITOR] Thresholds updated');
  }

  /**
   * Get performance report
   */
  getPerformanceReport(): {
    metrics: SystemMetrics;
    alerts: ResourceAlert[];
    summary: {
      overall: 'healthy' | 'degraded' | 'critical';
      issues: string[];
      recommendations: string[];
    };
  } {
    const criticalAlerts = this.getAlertsBySeverity('critical');
    const warningAlerts = this.getAlertsBySeverity('warning');
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalAlerts.length > 0) {
      overall = 'critical';
    } else if (warningAlerts.length > 0) {
      overall = 'degraded';
    }

    const issues = this.alerts.map(alert => alert.title);
    const recommendations = this.alerts.flatMap(alert => alert.recommendations);

    return {
      metrics: this.metrics,
      alerts: this.alerts,
      summary: {
        overall,
        issues,
        recommendations
      }
    };
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 [SYSTEM-RESOURCE-MONITOR] System resource monitoring stopped');
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.alerts = [];
    this.metricsHistory = [];
    console.log('🔄 [SYSTEM-RESOURCE-MONITOR] All metrics reset');
  }
}

// Export singleton instance
export const systemResourceMonitor = SystemResourceMonitor.getInstance();

// Export utility functions
export function getSystemMetrics(): SystemMetrics {
  return systemResourceMonitor.getMetrics();
}

export function getSystemResourceAlerts(): ResourceAlert[] {
  return systemResourceMonitor.getAlerts();
}

export function getSystemResourcePerformanceReport() {
  return systemResourceMonitor.getPerformanceReport();
}

export function getSystemMetricsHistory(limit?: number): SystemMetrics[] {
  return systemResourceMonitor.getMetricsHistory(limit);
}