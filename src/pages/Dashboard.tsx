import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Monitor, Container, HardDrive, Activity, Server, Cpu, Clock, Info } from 'lucide-react';
import api from '../api/client';
import { StatCard } from '../components/ui/StatCard';
import { ClusterResourceCard } from '../components/ui/ClusterResourceCard';
import { SystemHealthCard } from '../components/ui/SystemHealthCard';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    vms: 0,
    containers: 0,
    jails: 0
  });
  const [systemHealth, setSystemHealth] = useState({
    cpu: 0,
    memory: 0,
    disk: 0,
    network: { in: 0, out: 0 },
    uptime: '—'
  });
  const [clusterStats, setClusterStats] = useState<{
    nodes?: { online: number, total: number },
    cpu?: { used: number, total: number, percentage: number },
    memory?: { used: string, total: string, percentage: number },
    disk?: { used: string, total: string, percentage: number }
  } | null>(null);
  const [systemInfo, setSystemInfo] = useState({
    hostname: '—',
    os: '—',
    cpu: '—',
    cores: '—'
  });
  const [hostDetail, setHostDetail] = useState<{
    arch?: string,
    loadAverage?: number[],
    totalMemory?: string,
    freeMemory?: string
  } | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [vms, containers, jails, statsRes, infoRes, hostRes, clusterRes] = await Promise.all([
          api.get('/vms'),
          api.get('/containers'),
          api.get('/jails'),
          api.get('/system/stats'),
          api.get('/system/info'),
          api.get('/system/host'),
          api.get('/cluster/stats')
        ]);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isJson = (res: any) => 
          res.headers?.['content-type']?.includes('application/json') || 
          (!res.headers?.['content-type'] && typeof res.data === 'object');

        setStats({
          vms: (isJson(vms) && Array.isArray(vms.data)) ? vms.data.length : 0,
          containers: (isJson(containers) && Array.isArray(containers.data)) ? containers.data.length : 0,
          jails: (isJson(jails) && Array.isArray(jails.data)) ? jails.data.length : 0
        });

        if (isJson(statsRes) && statsRes.data) setSystemHealth(statsRes.data);
        if (isJson(infoRes) && infoRes.data) setSystemInfo(infoRes.data);
        if (isJson(hostRes) && hostRes.data) setHostDetail(hostRes.data);
        if (isJson(clusterRes) && clusterRes.data) setClusterStats(clusterRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data', err);
      }
    };
    fetchDashboardData();

    const interval = setInterval(fetchDashboardData, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { name: t('common.vms'), count: stats.vms, icon: Monitor, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-500/20', path: '/vms' },
    { name: t('common.containers'), count: stats.containers, icon: Container, color: 'from-cyan-500 to-cyan-600', shadow: 'shadow-cyan-500/20', path: '/containers' },
    { name: t('common.jails'), count: stats.jails, icon: HardDrive, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-500/20', path: '/jails' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{t('common.dashboard')}</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">{t('dashboard.title')}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 rounded-2xl shadow-soft border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{t('dashboard.system_live')}</span>
        </div>
      </div>

      {/* Cluster Resources section */}
      {clusterStats && clusterStats.nodes && clusterStats.cpu && clusterStats.memory && clusterStats.disk && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Server className="text-brand-600 dark:text-brand-400" size={24} />
            <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{t('dashboard.cluster_resources')}</h2>
            <div className="ml-auto flex items-center gap-2 px-3 py-1 bg-brand-50 dark:bg-brand-500/10 rounded-full border border-brand-100 dark:border-brand-500/20 transition-colors duration-300">
              <Activity size={14} className="text-brand-600 dark:text-brand-400" />
              <span className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">
                {`${clusterStats.nodes?.online ?? 0} / ${clusterStats.nodes?.total ?? 0} ${t('dashboard.nodes_online')}`}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ClusterResourceCard 
              title={t('common.cpu')} 
              used={`${clusterStats.cpu?.used ?? 0} ${t('common.vcpu')}`} 
              total={`${clusterStats.cpu?.total ?? 0} ${t('common.vcpu')}`} 
              percentage={clusterStats.cpu?.percentage ?? 0} 
              icon={Cpu} 
              color="blue" 
              utilizedLabel={t('dashboard.utilized')}
              ofLabel={t('dashboard.of')}
            />
            <ClusterResourceCard 
              title={t('common.memory')} 
              used={`${clusterStats.memory?.used ?? '0GB'}`.replace('GB', t('common.gb')).replace('TB', t('common.tb'))} 
              total={`${clusterStats.memory?.total ?? '0GB'}`.replace('GB', t('common.gb')).replace('TB', t('common.tb'))} 
              percentage={clusterStats.memory?.percentage ?? 0} 
              icon={Activity} 
              color="purple" 
              utilizedLabel={t('dashboard.utilized')}
              ofLabel={t('dashboard.of')}
            />
            <ClusterResourceCard 
              title={t('common.storage')} 
              used={`${clusterStats.disk?.used ?? '0GB'}`.replace('GB', t('common.gb')).replace('TB', t('common.tb'))} 
              total={`${clusterStats.disk?.total ?? '0GB'}`.replace('GB', t('common.gb')).replace('TB', t('common.tb'))} 
              percentage={clusterStats.disk?.percentage ?? 0} 
              icon={HardDrive} 
              color="emerald" 
              utilizedLabel={t('dashboard.utilized')}
              ofLabel={t('dashboard.of')}
            />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <motion.div 
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((stat) => (
          <StatCard
            key={stat.name}
            name={stat.name}
            count={stat.count}
            icon={stat.icon}
            color={stat.color}
            shadow={stat.shadow}
            path={stat.path}
          />
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Health */}
        <SystemHealthCard
          systemHealth={systemHealth}
          cpuLabel={t('dashboard.cpu_usage')}
          memoryLabel={t('dashboard.memory_usage')}
          diskLabel={t('dashboard.disk_usage')}
          networkInLabel={t('dashboard.network_in')}
          networkOutLabel={t('dashboard.network_out')}
          mbpsLabel={t('dashboard.mbps')}
          liveMetricsLabel={t('dashboard.live_metrics')}
          systemHealthLabel={t('dashboard.system_health')}
        />

        {/* Info Column */}
        <div className="space-y-8">
          <motion.div 
            variants={fadeInUp}
            className="bg-white/80 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-white/10 p-8 rounded-2xl shadow-soft transition-all hover:shadow-xl hover:-translate-y-1"
          >
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-8 flex items-center gap-3">
              <div className="p-2 bg-brand-100 dark:bg-brand-500/20 text-brand-600 dark:text-brand-400 rounded-lg">
                <Server size={20} />
              </div>
              {t('dashboard.server_info')}
            </h2>
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-slate-50 dark:bg-slate-800 rounded text-slate-400 dark:text-slate-500">
                  <Info size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{systemInfo.hostname === '—' ? t('common.loading') : systemInfo.hostname}</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                    {systemInfo.os === '—' ? t('common.loading') : systemInfo.os} • {hostDetail?.arch || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-slate-50 dark:bg-slate-800 rounded text-slate-400 dark:text-slate-500">
                  <Cpu size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">{systemInfo.cpu === '—' ? t('common.loading') : systemInfo.cpu}</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                    {systemInfo.cores === '—' ? t('common.loading') : `${systemInfo.cores} ${t('dashboard.cores')}`} • {t('dashboard.load')}: {hostDetail?.loadAverage?.map((l: number) => l.toFixed(2)).join(', ') || '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="mt-1 p-1 bg-slate-50 dark:bg-slate-800 rounded text-slate-400 dark:text-slate-500">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100">{t('dashboard.uptime')}</p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{systemHealth.uptime === '—' ? t('common.loading') : systemHealth.uptime}</p>
                </div>
              </div>
              {hostDetail && (
                <div className="pt-6 border-t border-slate-50 dark:border-slate-800 mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.total_ram')}</p>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-300">{hostDetail.totalMemory}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">{t('dashboard.free_ram')}</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{hostDetail.freeMemory}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
