import * as React from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Stack } from "@mui/material";

export default function ConfirmImpactDialog({
  open,
  title,
  message,
  details = [],
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
  loading = false,
}: {
  open: boolean;
  title: string;
  message: string;
  details?: string[];
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mt: 0.5 }}>
          <Typography variant="body2">{message}</Typography>
          {details.length > 0 && (
            <Stack component="ul" sx={{ pl: 3, m: 0 }} spacing={0.5}>
              {details.map((d, i) => (
                <li key={i}><Typography variant="body2">• {d}</Typography></li>
              ))}
            </Stack>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={loading}>{cancelLabel}</Button>
        <Button onClick={onConfirm} disabled={loading} variant="contained">
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
