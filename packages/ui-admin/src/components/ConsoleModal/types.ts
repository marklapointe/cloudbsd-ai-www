import type { Resource } from '../ResourceList/types';
import type { Socket } from 'socket.io-client';

export interface ConsoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: Resource | null;
  resourceType: string;
  socket?: Socket;
}
