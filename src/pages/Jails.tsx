import React from 'react';
import { HardDrive } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ResourceList from '../components/ResourceList';

const Jails: React.FC = () => {
  const { t } = useTranslation();
  return (
    <ResourceList
      title={t('jails.title')}
      description={t('jails.description')}
      endpoint="/jails"
      icon={HardDrive}
      resourceName={t('jails.resource_name')}
      columns={[
        { header: t('common.ip_address'), accessor: 'ip' },
        { 
          header: t('common.status'), 
          accessor: 'status',
          render: (val) => (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
              val === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
            }`}>
              {t(`common.${val}`)}
            </span>
          )
        }
      ]}
    />
  );
};

export default Jails;
