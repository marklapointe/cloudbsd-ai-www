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
    { name: 'Virtual Machines', count: stats.vms, icon: Monitor, color: 'bg-blue-500' },
    { name: 'Docker Containers', count: stats.docker, icon: Container, color: 'bg-cyan-500' },
    { name: 'FreeBSD Jails', count: stats.jails, icon: HardDrive, color: 'bg-emerald-500' },
    { name: 'Podman Containers', count: stats.podman, icon: Box, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500">System overview and resource usage</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4">
            <div className={`${stat.color} p-3 rounded-lg text-white`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.name}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">System Health</h2>
            <Activity className="text-emerald-500" />
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1 text-sm font-medium">
                <span>CPU Usage</span>
                <span>{systemHealth.cpu}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${systemHealth.cpu}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm font-medium">
                <span>Memory Usage</span>
                <span>{systemHealth.memory}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${systemHealth.memory}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1 text-sm font-medium">
                <span>Disk Usage</span>
                <span>{systemHealth.disk}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div 
                  className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                  style={{ width: `${systemHealth.disk}%` }}
                ></div>
              </div>
            </div>

            <div className="pt-4 grid grid-cols-2 gap-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ArrowDownLeft size={16} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Network In</p>
                  <p className="text-sm font-bold text-slate-900">{systemHealth.network.in} Mbps</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                  <ArrowUpRight size={16} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Network Out</p>
                  <p className="text-sm font-bold text-slate-900">{systemHealth.network.out} Mbps</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* System Info */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Server size={20} className="text-blue-600" />
              Server Info
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Info size={18} />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{systemInfo.hostname}</p>
                  <p className="text-xs">{systemInfo.os} ({hostDetail?.arch})</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Cpu size={18} />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{systemInfo.cpu}</p>
                  <p className="text-xs">{systemInfo.cores} | Load: {hostDetail?.loadAverage?.map((l: number) => l.toFixed(2)).join(', ')}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <Clock size={18} />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">Uptime</p>
                  <p className="text-xs">{systemHealth.uptime}</p>
                </div>
              </div>
              {hostDetail && (
                <div className="pt-2 border-t border-slate-100 mt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Total RAM</p>
                      <p className="font-bold text-slate-700">{hostDetail.totalMemory}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Free RAM</p>
                      <p className="font-bold text-slate-700">{hostDetail.freeMemory}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Globe size={20} className="text-purple-600" />
              Web Frontend Info
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-slate-600">
                <Info size={18} />
                <div className="text-sm">
                  <p className="font-medium text-slate-900">{browserInfo.browser}</p>
                  <p className="text-xs">{browserInfo.platform}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                <p>Language: {browserInfo.language}</p>
                <p>URL: {window.location.origin}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
