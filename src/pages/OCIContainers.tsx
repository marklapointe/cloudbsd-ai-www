import React from 'react';
import { Container } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResourceList from '../components/ResourceList';

const OCIContainers: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ResourceList
      title={t('containers.title')}
      description={t('containers.description')}
      endpoint="/containers"
      icon={Container}
      resourceName={t('containers.resource_name')}
      columns={[
        { header: t('common.image'), accessor: 'image' },
        { 
          header: t('common.status'), 
          accessor: 'status',
          render: (val) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              val === 'up' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {t(`common.${val}`)}
            </span>
          )
        }
      ]}
    />
  );
};

export default OCIContainers;
