import type { LucideIcon } from 'lucide-react';
import type { Socket } from 'socket.io-client';

export interface Resource {
  id: string | number;
  name: string;
  status: string;
  image?: string;
  ip?: string;
  cpu?: number | string;
  memory?: string;
  [key: string]: unknown;
}

export interface Column {
  header: string;
  accessor: string;
  render?: (val: unknown) => React.ReactNode;
  sortable?: boolean;
}

export interface ResourceListProps {
  title: string;
  description: string;
  icon: LucideIcon;
  resourceName: string;
  resourceType: string;
  columns: Column[];

  // API callbacks - consuming app provides these
  onFetch: () => Promise<{ data: Resource[] }>;
  onAction: (id: string | number, action: string) => Promise<void>;
  onDelete: (id: string | number) => Promise<void>;
  onCreate: (data: { name: string; image?: string; ip?: string; cpu?: number; memory?: string }) => Promise<void>;
  onUpdate: (id: string | number, data: { name: string; image?: string; ip?: string; cpu?: number; memory?: string }) => Promise<void>;

  // Socket subscription callback (optional)
  onSocketEvent?: (callback: (data: { resource: string }) => void) => () => void;

  // Socket instance for console connections
  socket: Socket;

  // Role check - consuming app provides this
  isOperator: boolean;
}
