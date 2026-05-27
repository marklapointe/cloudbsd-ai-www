export interface Resource {
  id: string | number;
  name: string;
  status: string;
  image?: string;
  ip?: string;
  cpu?: number | string;
  memory?: string;
}

export interface ResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: string;
  resourceName: string;
  initialData?: Resource | null;
  onSubmit: (data: { name: string; image?: string; ip?: string; cpu?: number; memory?: string }) => Promise<void>;
  onUpdate?: (id: string | number, data: { name: string; image?: string; ip?: string; cpu?: number; memory?: string }) => Promise<void>;
}
