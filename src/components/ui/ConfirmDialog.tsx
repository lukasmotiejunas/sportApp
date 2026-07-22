import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Patvirtinti',
  cancelLabel = 'Atšaukti',
  destructive = false,
}: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {destructive && <AlertTriangle className="h-5 w-5 text-red-500" />}
          <span>{title}</span>
        </div>
      }
      size="sm"
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? 'btn-primary bg-red-600 hover:bg-red-500 dark:bg-red-500 dark:text-white' : 'btn-primary'}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-ink-600 dark:text-ink-300">{message}</p>
    </Modal>
  );
}
