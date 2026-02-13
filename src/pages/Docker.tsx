import React from 'react';
import { Container } from 'lucide-react';
import ResourceList from '../components/ResourceList';

const Docker: React.FC = () => {
  return (
    <ResourceList
      title="Docker Containers"
      description="Manage your Docker containers and images"
      endpoint="/docker"
      icon={Container}
      resourceName="Container"
      columns={[
        { header: 'Image', accessor: 'image' },
        { 
          header: 'Status', 
          accessor: 'status',
          render: (val) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              val === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {val}
            </span>
          )
        }
      ]}
    />
  );
};

export default Docker;
