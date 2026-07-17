/**
 * Canonical sidebar IA — product-ia §3.1.
 * Single source of truth for shell navigation.
 */
export interface NavItem {
  id: string;
  label: string;
  path: string;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'workload',
    label: 'Workload',
    items: [
      { id: 'dashboard', label: 'Dashboard', path: '/dashboard' },
      { id: 'vms', label: 'Virtual Machines', path: '/vms' },
      { id: 'containers', label: 'Containers', path: '/containers' },
      { id: 'jails', label: 'Jails', path: '/jails' },
      { id: 'storage', label: 'Storage', path: '/storage' },
      { id: 'networks', label: 'Networks', path: '/networks' },
      { id: 'hosts', label: 'Hosts', path: '/hosts' },
      { id: 'cluster', label: 'Cluster', path: '/cluster' },
      { id: 'tasks', label: 'Tasks', path: '/tasks' },
      { id: 'library', label: 'Library', path: '/library' },
    ],
  },
  {
    id: 'access',
    label: 'Access',
    items: [
      { id: 'users', label: 'Users', path: '/users' },
      { id: 'roles', label: 'Roles', path: '/roles' },
      { id: 'api-keys', label: 'API keys', path: '/api-keys' },
    ],
  },
  {
    id: 'observe',
    label: 'Observe',
    items: [
      { id: 'logs', label: 'Logs', path: '/logs' },
      { id: 'notifications', label: 'Notifications', path: '/notifications' },
      { id: 'audit', label: 'Audit', path: '/audit' },
    ],
  },
  {
    id: 'configure',
    label: 'Configure',
    items: [
      { id: 'settings', label: 'Settings', path: '/settings' },
      { id: 'mcp', label: 'MCP', path: '/mcp' },
    ],
  },
  {
    id: 'operate',
    label: 'Operate',
    items: [
      { id: 'system', label: 'System', path: '/system' },
      { id: 'about', label: 'About', path: '/about' },
    ],
  },
];
