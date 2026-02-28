import React from 'react';
import { HardDrive } from 'lucide-react';
import ResourceList from '../components/ResourceList';

const Jails: React.FC = () => {
  return (
    <ResourceList
      title="Jails"
      description="Manage your native jails and isolation"
      endpoint="/jails"
      icon={HardDrive}
      resourceName="Jail"
      columns={[
        { header: 'IP Address', accessor: 'ip' },
        { 
          header: 'Status', 
          accessor: 'status',
          render: (val) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              val === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {val}
            </span>
          )
        }
      ]}
    />
  );
};

export default Jails;
