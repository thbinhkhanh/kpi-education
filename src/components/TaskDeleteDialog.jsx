import React from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from "@mui/material";

import { Close, Delete } from "@mui/icons-material";

export default function TaskDeleteDialog({
  open,
  onClose,
  onConfirm,
  taskName,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          overflow: "hidden",
          background: "#f8fafc",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          pr: 1.5,
          py: 1.5,
          bgcolor: "#1976d2",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          sx={{
            fontSize: 16,
            fontWeight: 700,
          }}
        >
          🎯 Xác nhận xóa nhiệm vụ
        </Typography>

        <IconButton
          onClick={onClose}
          sx={{
            color: "#fff",
            bgcolor: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.25)",
            p: 0.8,
            "&:hover": {
              bgcolor: "#fff",
              color: "#ef4444",
            },
          }}
        >
          <Close />
        </IconButton>
      </Box>

      {/* CONTENT */}
      <DialogContent
        sx={{
          px: 3,
          py: 3,
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            color: "#1e293b",
            fontSize: 15,
            fontWeight: 600,
            mb: 1,
          }}
        >
          Bạn có chắc chắn muốn xóa nhiệm vụ này?
        </Typography>

        {taskName && (
          <Typography
            sx={{
              color: "#2563eb",
              fontSize: 14,
              fontWeight: 700,
              bgcolor: "#eff6ff",
              p: 1.5,
              borderRadius: "8px",
              border: "1px solid #dbeafe",
              wordBreak: "break-word",
              mb: 1,
            }}
          >
            "{taskName}"
          </Typography>
        )}

        <Typography
          sx={{
            color: "#64748b",
            fontSize: 13,
            fontStyle: "italic",
          }}
        >
          Nhiệm vụ này sẽ bị loại bỏ khỏi danh mục và không thể hoàn tác.
        </Typography>
      </DialogContent>

      {/* FOOTER */}
      <DialogActions
        sx={{
          px: 3,
          pb: 2.5,
          justifyContent: "flex-end",
          gap: 1.5,
        }}
      >
        <Button
          onClick={onClose}
          variant="outlined"
          sx={{
            minWidth: 100,
            height: 40,
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: 600,
            borderColor: "#cbd5e1",
            color: "#475569",
            background: "#fff",
            "&:hover": {
              borderColor: "#94a3b8",
              background: "#f1f5f9",
            },
          }}
        >
          Hủy
        </Button>

        <Button
          variant="contained"
          color="error"
          startIcon={<Delete />}
          onClick={onConfirm}
          sx={{
            minWidth: 120,
            height: 40,
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: 700,
            background: "linear-gradient(135deg, #ef4444, #dc2626)",
            boxShadow: "0 10px 20px rgba(239,68,68,0.25)",
            "&:hover": {
              background: "linear-gradient(135deg, #dc2626, #b91c1c)",
              boxShadow: "0 12px 24px rgba(220,38,38,0.35)",
            },
          }}
        >
          Xác nhận xóa
        </Button>
      </DialogActions>
    </Dialog>
  );
}