import React, { useEffect, useState } from 'react';
import { 
  Monitor, 
  Container, 
  HardDrive, 
  Box,
  Activity,
  Server,
  Cpu,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
  Globe
} from 'lucide-react';
import api from '../api/client';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    vms: 0,
    docker: 0,
    jails: 0,
    podman: 0
  });
  const [systemHealth, setSystemHealth] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { in: '0', out: '0' },
    uptime: 'Loading...'
  });
  const [systemInfo, setSystemInfo] = useState({
    hostname: 'Loading...',
    os: 'Loading...',
    cpu: 'Loading...',
    cores: 'Loading...'
  });
  const [hostDetail, setHostDetail] = useState<any>(null);
  const [browserInfo, setBrowserInfo] = useState({
    browser: 'Loading...',
    platform: 'Loading...',
    language: 'Loading...'
  });

  useEffect(() => {
    // Get browser info
    const ua = navigator.userAgent;
    let browser = "Unknown";
    if (ua.indexOf("Firefox") > -1) browser = "Firefox";
    else if (ua.indexOf("Chrome") > -1) browser = "Chrome";
    else if (ua.indexOf("Safari") > -1) browser = "Safari";
    else if (ua.indexOf("Edge") > -1) browser = "Edge";

    setBrowserInfo({
      browser: browser,
      platform: navigator.platform,
      language: navigator.language
    });

    const fetchDashboardData = async () => {
      try {
        const [vms, docker, jails, podman, statsRes, infoRes, hostRes] = await Promise.all([
          api.get('/vms'),
          api.get('/docker'),
          api.get('/jails'),
          api.get('/podman'),
          api.get('/system/stats'),
          api.get('/system/info'),
          api.get('/system/host')
        ]);
        setStats({
          vms: vms.data.length,
          docker: docker.data.length,
          jails: jails.data.length,
          podman: podman.data.length
        });
        setSystemHealth(statsRes.data);
        setSystemInfo(infoRes.data);
        setHostDetail(hostRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { name: 'Virtual Machines', count: stats.vms, icon: Monitor, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20' },
    { name: 'Docker Containers', count: stats.docker, icon: Container, color: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20' },
    { name: 'FreeBSD Jails', count: stats.jails, icon: HardDrive, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20' },
    { name: 'Podman Containers', count: stats.podman, icon: Box, color: 'from-purple-500 to-purple-600', shadow: 'shadow-purple-500/20' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1 font-medium">Real-time system overview and resource monitoring</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-soft border border-slate-100">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">System Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="group bg-white p-6 rounded-3xl shadow-soft border border-slate-100 flex items-center gap-5 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95">
            <div className={`bg-gradient-to-br ${stat.color} p-4 rounded-2xl text-white shadow-lg ${stat.shadow} transform transition-transform group-hover:rotate-6`}>
              <stat.icon size={26} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{stat.name}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Health */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-soft border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-slate-900">System Health</h2>
              <p className="text-sm text-slate-500 font-medium">Live resource utilization metrics</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl text-slate-400">
              <Activity size={24} />
            </div>
          </div>
          <div className="space-y-8">
            <div className="group">
              <div className="flex justify-between mb-3 items-end">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">CPU Usage</span>
                <span className="text-lg font-black text-blue-600">{systemHealth.cpu}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg shadow-blue-500/20" 
                  style={{ width: `${systemHealth.cpu}%` }}
                ></div>
              </div>
            </div>
            <div className="group">
              <div className="flex justify-between mb-3 items-end">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Memory Usage</span>
                <span className="text-lg font-black text-emerald-600">{systemHealth.memory}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg shadow-emerald-500/20" 
                  style={{ width: `${systemHealth.memory}%` }}
                ></div>
              </div>
            </div>
            <div className="group">
              <div className="flex justify-between mb-3 items-end">
                <span className="text-sm font-bold text-slate-700 uppercase tracking-wider">Disk Usage</span>
                <span className="text-lg font-black text-amber-600">{systemHealth.disk}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-amber-500 to-amber-600 h-full rounded-full transition-all duration-1000 ease-out shadow-lg shadow-amber-500/20" 
                  style={{ width: `${systemHealth.disk}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-8 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-50">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-slate-50">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
                  <ArrowDownLeft size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Network In</p>
                  <p className="text-lg font-black text-slate-900 leading-tight">{systemHealth.network.in} <span className="text-xs font-bold text-slate-500">Mbps</span></p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 transition-colors hover:bg-slate-50">
                <div className="p-3 bg-purple-100 text-purple-600 rounded-xl shadow-sm">
                  <ArrowUpRight size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Network Out</p>
                  <p className="text-lg font-black text-slate-900 leading-tight">{systemHealth.network.out} <span className="text-xs font-bold text-slate-500">Mbps</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Column */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-soft border border-slate-100 transition-all hover:shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-8 flex items-center gap-3">
              <div className="p-2 bg-brand-100 text-brand-600 rounded-lg">
                <Server size={20} />
              </div>
              Server Info
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-slate-50 rounded text-slate-400">
                  <Info size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">{systemInfo.hostname}</p>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{systemInfo.os} • {hostDetail?.arch}</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-slate-50 rounded text-slate-400">
                  <Cpu size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 truncate">{systemInfo.cpu}</p>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
                    {systemInfo.cores} • Load: {hostDetail?.loadAverage?.map((l: number) => l.toFixed(2)).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-slate-50 rounded text-slate-400">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900">Uptime</p>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">{systemHealth.uptime}</p>
                </div>
              </div>
              {hostDetail && (
                <div className="pt-6 border-t border-slate-50 mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total RAM</p>
                    <p className="text-sm font-black text-slate-700">{hostDetail.totalMemory}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Free RAM</p>
                    <p className="text-sm font-black text-emerald-600">{hostDetail.freeMemory}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-8 rounded-3xl shadow-2xl border border-slate-800 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Globe size={120} />
            </div>
            <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
              <div className="p-2 bg-white/10 text-white rounded-lg backdrop-blur-md">
                <Globe size={20} />
              </div>
              Client Info
            </h2>
            <div className="space-y-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-white/5 rounded text-slate-400">
                  <Monitor size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-white">{browserInfo.browser}</p>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">{browserInfo.platform}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-white/5 mt-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest space-y-2">
                <p>Language: <span className="text-slate-300 ml-1">{browserInfo.language}</span></p>
                <p className="truncate">URL: <span className="text-slate-300 ml-1 font-mono">{window.location.origin}</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
