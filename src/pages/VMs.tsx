import React from 'react';
import { Monitor } from 'lucide-react';
import ResourceList from '../components/ResourceList';

const VMs: React.FC = () => {
  return (
    <ResourceList
      title="Virtual Machines"
      description="Manage your bhyve and other virtual instances"
      endpoint="/vms"
      icon={Monitor}
      resourceName="VM"
      columns={[
        { 
          header: 'Status', 
          accessor: 'status',
          render: (val) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              val === 'running' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {val}
            </span>
          )
        },
        { 
          header: 'CPU', 
          accessor: 'cpu',
          render: (val) => `${val} vCPU`
        },
        { 
          header: 'Memory', 
          accessor: 'memory'
        }
      ]}
    />
  );
};

export default VMs;
