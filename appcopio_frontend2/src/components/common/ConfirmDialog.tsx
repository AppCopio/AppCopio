import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

export default function ConfirmDialog({
  open,
  title = 'Confirmar',
  message,
  onClose,
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  showCancel = true,
}: {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean; 
}) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        {showCancel && <Button onClick={onClose}>{cancelText}</Button>}
        <Button variant="contained" onClick={onConfirm}>
          {confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
