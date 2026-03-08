import React from 'react';
import { Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResourceList from '../components/ResourceList';

const VMs: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ResourceList
      title={t('vms.title')}
      description={t('vms.description')}
      endpoint="/vms"
      icon={Monitor}
      resourceName={t('vms.resource_name')}
      resourceType="vm"
      columns={[
        { 
          header: t('common.status'), 
          accessor: 'status',
          render: (val) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              val === 'running' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {t(`common.${val}`)}
            </span>
          )
        },
        { 
          header: t('common.cpu'), 
          accessor: 'cpu',
          render: (val) => `${val} ${t('common.vcpu')}`
        },
        { 
          header: t('common.memory'), 
          accessor: 'memory'
        }
      ]}
    />
  );
};

export default VMs;
