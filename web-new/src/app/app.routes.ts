import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';
import { LayoutComponent } from './layout/layout.component';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'onboarding',
        loadComponent: () =>
          import('./pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
      },
      {
        path: 'vms/create',
        loadComponent: () =>
          import('./pages/vms/vm-create.page').then((m) => m.VmCreatePage),
      },
      {
        path: 'vms',
        loadComponent: () => import('./pages/vms/vms.page').then((m) => m.VmsPage),
      },
      {
        path: 'vms/:id/console',
        loadComponent: () =>
          import('./pages/vms/vm-console.page').then((m) => m.VmConsolePage),
      },
      {
        path: 'vms/:id',
        loadComponent: () =>
          import('./pages/vms/vm-detail.page').then((m) => m.VmDetailPage),
      },
      {
        path: 'containers/create',
        loadComponent: () =>
          import('./pages/containers/container-create.page').then(
            (m) => m.ContainerCreatePage,
          ),
      },
      {
        path: 'containers',
        loadComponent: () =>
          import('./pages/containers/containers.page').then((m) => m.ContainersPage),
      },
      {
        path: 'containers/:id',
        loadComponent: () =>
          import('./pages/containers/container-detail.page').then(
            (m) => m.ContainerDetailPage,
          ),
      },
      {
        path: 'jails/create',
        loadComponent: () =>
          import('./pages/jails/jail-create.page').then((m) => m.JailCreatePage),
      },
      {
        path: 'jails',
        loadComponent: () => import('./pages/jails/jails.page').then((m) => m.JailsPage),
      },
      {
        path: 'jails/:id',
        loadComponent: () =>
          import('./pages/jails/jail-detail.page').then((m) => m.JailDetailPage),
      },
      {
        path: 'storage/create',
        loadComponent: () =>
          import('./pages/storage/volume-create.page').then((m) => m.VolumeCreatePage),
      },
      {
        path: 'storage',
        loadComponent: () =>
          import('./pages/storage/storage.page').then((m) => m.StoragePage),
      },
      {
        path: 'storage/:id',
        loadComponent: () =>
          import('./pages/storage/volume-detail.page').then((m) => m.VolumeDetailPage),
      },
      {
        path: 'networks/create',
        loadComponent: () =>
          import('./pages/networks/network-create.page').then((m) => m.NetworkCreatePage),
      },
      {
        path: 'networks',
        loadComponent: () =>
          import('./pages/networks/networks.page').then((m) => m.NetworksPage),
      },
      {
        path: 'hosts',
        loadComponent: () => import('./pages/hosts/hosts.page').then((m) => m.HostsPage),
      },
      {
        path: 'hosts/:id',
        loadComponent: () =>
          import('./pages/hosts/host-detail.page').then((m) => m.HostDetailPage),
      },
      {
        path: 'tasks',
        loadComponent: () => import('./pages/tasks/tasks.page').then((m) => m.TasksPage),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./pages/library/library.page').then((m) => m.LibraryPage),
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/users/users.page').then((m) => m.UsersPage),
      },
      {
        path: 'roles/capabilities',
        loadComponent: () =>
          import('./pages/users/roles-capabilities.page').then(
            (m) => m.RolesCapabilitiesPage,
          ),
      },
      { path: 'roles', redirectTo: 'users' },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./pages/notifications/notifications.page').then(
            (m) => m.NotificationsPage,
          ),
      },
      {
        path: 'cluster',
        loadComponent: () =>
          import('./pages/cluster/cluster.page').then((m) => m.ClusterPage),
      },
      {
        path: 'mcp/add',
        loadComponent: () =>
          import('./pages/mcp/mcp-add.page').then((m) => m.McpAddPage),
      },
      {
        path: 'mcp',
        loadComponent: () => import('./pages/mcp/mcp.page').then((m) => m.McpPage),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./pages/about/about.page').then((m) => m.AboutPage),
      },
      {
        path: 'api-keys/create',
        loadComponent: () =>
          import('./pages/api-keys/api-key-create.page').then((m) => m.ApiKeyCreatePage),
      },
      {
        path: 'api-keys',
        loadComponent: () =>
          import('./pages/api-keys/api-keys.page').then((m) => m.ApiKeysPage),
      },
      {
        path: 'logs',
        loadComponent: () => import('./pages/logs/logs.page').then((m) => m.LogsPage),
      },
      {
        path: 'audit',
        loadComponent: () => import('./pages/audit/audit.page').then((m) => m.AuditPage),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.page').then((m) => m.SettingsPage),
      },
      {
        path: 'system/restore',
        loadComponent: () =>
          import('./pages/system/restore.page').then((m) => m.RestorePage),
      },
      {
        path: 'system',
        loadComponent: () =>
          import('./pages/system/system.page').then((m) => m.SystemPage),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./pages/account/account.page').then((m) => m.AccountPage),
      },
      {
        path: 'error/:code',
        loadComponent: () =>
          import('./pages/errors/error.page').then((m) => m.ErrorPage),
      },
    ],
  },
  { path: '**', redirectTo: 'error/404' },
];
