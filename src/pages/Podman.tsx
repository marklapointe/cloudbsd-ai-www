import React from 'react';
import { Box } from 'lucide-react';
import ResourceList from '../components/ResourceList';

const Podman: React.FC = () => {
  return (
    <ResourceList
      title="Podman Containers"
      description="Manage your Podman pods and containers"
      endpoint="/podman"
      icon={Box}
      resourceName="Container"
      columns={[
        { header: 'Image', accessor: 'image' },
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
        }
      ]}
    />
  );
};

export default Podman;
