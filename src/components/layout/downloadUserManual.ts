import i18n from '../../i18n';

export const downloadUserManual = (t: (key: string) => string): void => {
  const manualContent = `# ${t('manual.title')}

## ${t('manual.introduction')}
${t('manual.intro_text')}

## ${t('manual.authentication')}

### ${t('manual.login')}
${t('manual.login_text')}

### ${t('manual.language_selection')}
${t('manual.language_text')}

## ${t('manual.dashboard')}
${t('manual.dashboard_text')}

## ${t('manual.resource_management')}

### ${t('manual.vms')}
${t('manual.vms_text')}

### ${t('manual.containers')}
${t('manual.containers_text')}

### ${t('manual.jails')}
${t('manual.jails_text')}

## ${t('manual.cluster')}
${t('manual.cluster_text')}

## ${t('manual.network_map')}
${t('manual.network_map_text')}

## ${t('manual.roles')}
- ${t('manual.roles_admin')}
- ${t('manual.roles_operator')}
- ${t('manual.roles_viewer')}

## ${t('manual.administration')}

### ${t('manual.user_management')}
${t('manual.user_management_text')}

### ${t('manual.logs')}
${t('manual.logs_text')}

### ${t('manual.settings')}
${t('manual.settings_text')}

## ${t('manual.troubleshooting')}
- ${t('manual.trouble_auth')}
- ${t('manual.trouble_lang')}
`;
  const blob = new Blob([manualContent], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `CloudBSD_User_Manual_${i18n.language}.md`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
