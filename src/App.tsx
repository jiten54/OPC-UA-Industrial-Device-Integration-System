import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Cpu, 
  Database, 
  Gauge, 
  History, 
  Info, 
  Settings, 
  ShieldAlert, 
  Thermometer, 
  Zap 
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DeviceData {
  timestamp: number;
  device_id: string;
  metric: string;
  deviceName?: string;
  value: number;
  unit: string;
  status: string;
}

interface DeviceStatus {
  deviceId: string;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [data, setData] = useState<Record<string, DeviceData[]>>({});
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<DeviceData[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io();
    setSocket(newSocket);

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('device_data', (newData: any) => {
      setData(prev => {
        const deviceData = prev[newData.device_id] || [];
        // Use device_id consistently
        const updated = [...deviceData, newData].slice(-50);
        return { ...prev, [newData.device_id]: updated };
      });
      // Add to logs if it's an anomaly or just a regular update
      setLogs(prev => [newData, ...prev].slice(0, 100));
    });

    newSocket.on('device_status', (statusUpdate: any) => {
      setStatuses(prev => ({ ...prev, [statusUpdate.deviceId]: statusUpdate.status }));
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'CRITICAL': return 'bg-critical text-white';
      case 'WARNING': return 'bg-warning text-black';
      default: return 'bg-success text-white';
    }
  };

  const getIcon = (name: string) => {
    if (name.includes('Temperature')) return <Thermometer className="w-5 h-5 text-primary" />;
    if (name.includes('Pressure')) return <Gauge className="w-5 h-5 text-primary" />;
    if (name.includes('Voltage')) return <Zap className="w-5 h-5 text-primary" />;
    return <Activity className="w-5 h-5 text-primary" />;
  };

  const injectFault = () => {
    socket?.emit('inject_fault');
  };

  return (
    <div className="flex h-screen w-full bg-bg overflow-hidden font-sans text-text-main">
      {/* Sidebar */}
      <aside className="w-[260px] bg-sidebar-bg text-white flex flex-col p-5 border-r border-border shrink-0">
        <div className="text-xl font-extrabold text-primary mb-8 tracking-tighter">
          CORE <span className="text-white">OPC-UA</span>
        </div>
        
        <div className="space-y-8 flex-1 overflow-y-auto custom-scrollbar">
          <section>
            <h3 className="text-[11px] uppercase text-text-muted font-bold tracking-widest mb-4">Integration Layer</h3>
            <div className="bg-white/5 p-4 rounded-lg font-mono text-xs space-y-4 border border-white/10">
              <div>
                <span className="text-[10px] text-gray-500 block mb-1 uppercase font-sans font-bold">Server Endpoint</span>
                <div className="truncate text-gray-300">opc.tcp://localhost:4334</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block mb-1 uppercase font-sans font-bold">Active Nodes</span>
                <div className="text-gray-300">{Object.keys(data).length} Configured / {isConnected ? Object.keys(data).length : 0} Online</div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 block mb-1 uppercase font-sans font-bold">Client Status</span>
                <div className={cn("font-bold", isConnected ? "text-success" : "text-critical")}>
                  {isConnected ? "Subscribed (10Hz)" : "Disconnected"}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-[11px] uppercase text-text-muted font-bold tracking-widest mb-4">Configuration</h3>
            <div className="text-[13px] text-gray-400 space-y-3 pl-1">
              <div className="flex justify-between"><span>Sampling:</span> <span className="text-white font-mono">100ms</span></div>
              <div className="flex justify-between"><span>Drift Comp:</span> <span className="text-success font-mono">ON</span></div>
              <div className="flex justify-between"><span>Anomaly Engine:</span> <span className="text-success font-mono">ACTIVE</span></div>
            </div>
          </section>
        </div>

        <button 
          onClick={injectFault}
          className="mt-6 bg-critical text-white font-bold py-3 rounded-md opacity-80 hover:opacity-100 transition-all uppercase text-[11px] tracking-widest shadow-lg shadow-critical/20 active:scale-95"
        >
          Inject System Fault
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-8 shrink-0 shadow-sm z-10">
          <h1 className="text-lg font-bold uppercase tracking-wider text-text-main">Device Monitoring System</h1>
          <div className={cn(
            "px-4 py-1 rounded-full text-[11px] font-extrabold border transition-colors",
            isConnected ? "bg-success/10 text-success border-success" : "bg-critical/10 text-critical border-critical"
          )}>
            SYSTEM {isConnected ? "OPERATIONAL" : "OFFLINE"}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6 bg-bg custom-scrollbar">
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.keys(data).map(deviceId => {
              const latest = data[deviceId][data[deviceId].length - 1];
              const status = statuses[deviceId] || latest.status || 'NORMAL';
              return (
                <div key={deviceId} className="bg-card-bg border border-border rounded-lg p-6 flex flex-col shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[12px] font-bold text-text-muted uppercase tracking-tight">{latest.deviceName || latest.metric}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-tighter",
                      status === 'CRITICAL' ? "bg-critical text-white" : 
                      status === 'WARNING' ? "bg-warning text-black" : 
                      "bg-success text-white"
                    )}>
                      {status}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline my-2">
                    <span className={cn(
                      "text-5xl font-mono font-light tracking-tighter",
                      status === 'CRITICAL' ? "text-critical" : status === 'WARNING' ? "text-warning" : "text-text-main"
                    )}>
                      {latest.value.toFixed(1)}
                    </span>
                    <span className="text-lg text-text-muted ml-1 font-medium">{latest.unit}</span>
                  </div>
                  
                  <div className="text-[11px] text-text-muted mb-6 font-medium">
                    Threshold: {latest.unit === '°C' ? '85.0' : latest.unit === 'bar' ? '9.0' : '245.0'}{latest.unit}
                  </div>

                  <div className="h-[70px] bg-gray-50 rounded border border-border/50 relative overflow-hidden mt-auto">
                    <div className="flex items-end h-full gap-0.5 p-1">
                      {data[deviceId].slice(-24).map((point, i) => (
                        <div 
                          key={i} 
                          className={cn(
                            "flex-1 transition-all duration-300",
                            i === data[deviceId].slice(-24).length - 1 ? "opacity-100" : "opacity-30",
                            status === 'CRITICAL' ? "bg-critical" : status === 'WARNING' ? "bg-warning" : "bg-primary"
                          )}
                          style={{ height: `${Math.max(5, Math.min(100, (point.value / (point.unit === '°C' ? 100 : point.unit === 'bar' ? 10 : 250)) * 100))}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Log Container */}
          <div className="bg-white border border-border rounded-lg flex flex-col overflow-hidden shadow-sm">
            <div className="bg-[#fdfdfd] px-6 py-4 border-b border-border flex justify-between items-center">
              <span className="text-[13px] font-bold uppercase tracking-tight text-text-main">Real-time Anomaly & Event Log</span>
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-bold text-text-muted uppercase">Total Events: {logs.length}</span>
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-border">
                    <th className="text-left px-6 py-3 text-text-muted font-bold uppercase text-[11px] tracking-wider">Timestamp</th>
                    <th className="text-left px-6 py-3 text-text-muted font-bold uppercase text-[11px] tracking-wider">Device ID</th>
                    <th className="text-left px-6 py-3 text-text-muted font-bold uppercase text-[11px] tracking-wider">Value</th>
                    <th className="text-left px-6 py-3 text-text-muted font-bold uppercase text-[11px] tracking-wider">Event Type</th>
                    <th className="text-left px-6 py-3 text-text-muted font-bold uppercase text-[11px] tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log, i) => (
                    <tr key={i} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-3 font-mono text-[11px] text-text-muted group-hover:text-text-main">
                        {new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 22)}
                      </td>
                      <td className="px-6 py-3 font-mono font-bold text-primary">{log.device_id}</td>
                      <td className="px-6 py-3 font-mono font-medium">{log.value.toFixed(2)}<span className="text-[10px] ml-0.5 opacity-60">{log.unit}</span></td>
                      <td className="px-6 py-3 text-text-muted text-[12px]">
                        {log.status !== 'NORMAL' ? (
                          <span className="flex items-center gap-1.5 text-critical font-bold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            THRESHOLD_VIOLATION
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Info className="w-3.5 h-3.5 opacity-40" />
                            TELEMETRY_UPDATE
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded-[3px] text-[10px] font-black uppercase tracking-tighter",
                          getStatusClass(log.status || 'NORMAL')
                        )}>
                          {log.status || 'NORMAL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #dfe6e9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #b2bec3;
        }
      `}} />
    </div>
  );
}
