export interface CustomPageSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (size: number) => void;
  initialValue: number | 'all';
}
