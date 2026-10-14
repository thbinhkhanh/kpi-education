import React, { useState, useEffect } from "react";
import {
  Dialog,
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  Stack,
  TextField,
  MenuItem,
  Switch,
} from "@mui/material";

import {
  AssignmentOutlined,
  Close,
  CheckCircle,
} from "@mui/icons-material";

export default function TaskEvaluationDialog({
  open,
  selectedTask,
  tasks = [],
  onClose,
  updateTask,
  formatScore,
  getMaxScore,
  getDefaultProgress,
  getDefaultResult,
  getPerformedScore,
  getActualScore,
  PROGRESS_OPTIONS = [],
  RESULT_OPTIONS = [],
  drawerInputSx,
}) {
  const [draftTask, setDraftTask] = useState(null);

  // CHỈ khởi tạo lại draftTask khi mở dialog hoặc thay đổi ID của task
  useEffect(() => {
    if (open && selectedTask) {
      setDraftTask({
        ...selectedTask,
        progressPercent: getDefaultProgress
          ? getDefaultProgress(selectedTask)
          : selectedTask.progressPercent ?? 100,
        resultPercent: getDefaultResult
          ? getDefaultResult(selectedTask)
          : selectedTask.resultPercent ?? 100,
        exceeded: selectedTask.exceeded ?? false,
      });
    } else {
      setDraftTask(null);
    }
  }, [open, selectedTask?.id]); // Dùng selectedTask?.id tránh bị reset khi re-render

  if (!draftTask) return null;

  const handleDraftChange = (field, value) => {
    setDraftTask((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleComplete = () => {
    if (updateTask && draftTask) {
      updateTask(draftTask);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: "#f8fafc",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          boxSizing: "border-box",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          color: "#fff",
          bgcolor: "#172554",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              bgcolor: "rgba(255,255,255,0.13)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <AssignmentOutlined />
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: "1rem", fontWeight: 800 }}>
              CHI TIẾT NHIỆM VỤ
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "#cbd5e1", mt: 0.5 }}>
              STT {tasks.findIndex((t) => t.id === draftTask.id) + 1}
              {" · "}Chỉnh sửa đánh giá
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: "#fff",
            "&:hover": { bgcolor: "rgba(255,255,255,0.15)" },
          }}
        >
          <Close />
        </IconButton>
      </Box>

      {/* Body */}
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <Stack spacing={2}>
          <Box>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              STT
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={tasks.findIndex((t) => t.id === draftTask.id) + 1}
              InputProps={{ readOnly: true }}
              sx={{
                ...drawerInputSx,
                "& .MuiInputBase-root": { bgcolor: "#f1f5f9" },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Tên công việc
            </Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              value={draftTask.taskName ?? ""}
              InputProps={{ readOnly: true }}
              sx={{
                ...drawerInputSx,
                "& .MuiInputBase-root": { bgcolor: "#f1f5f9" },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Điểm chuẩn
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={formatScore ? formatScore(draftTask.baseScore ?? 0) : draftTask.baseScore}
              InputProps={{ readOnly: true }}
              sx={{
                ...drawerInputSx,
                "& .MuiInputBase-root": { bgcolor: "#f1f5f9" },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Hệ số độ khó (%)
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={
                formatScore
                  ? formatScore(Number(draftTask.difficultyFactor ?? 1) * 100)
                  : Number(draftTask.difficultyFactor ?? 1) * 100
              }
              InputProps={{ readOnly: true }}
              sx={{
                ...drawerInputSx,
                "& .MuiInputBase-root": { bgcolor: "#f1f5f9" },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Điểm tối đa
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={
                formatScore && getMaxScore
                  ? formatScore(getMaxScore(draftTask))
                  : 0
              }
              InputProps={{ readOnly: true }}
              sx={{
                ...drawerInputSx,
                "& .MuiInputBase-root": { bgcolor: "#f1f5f9" },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          {/* Chọn Tiến độ % */}
          <Box sx={{ width: "100%", minWidth: 0 }}>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Tiến độ %
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={draftTask.progressPercent ?? 100}
              onChange={(e) =>
                handleDraftChange("progressPercent", Number(e.target.value))
              }
              sx={drawerInputSx}
            >
              {PROGRESS_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          {/* Chọn Kết quả % */}
          <Box sx={{ width: "100%", minWidth: 0 }}>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Kết quả %
            </Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={draftTask.resultPercent ?? 100}
              onChange={(e) =>
                handleDraftChange("resultPercent", Number(e.target.value))
              }
              sx={drawerInputSx}
            >
              {RESULT_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Điểm thực hiện
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={
                formatScore && getPerformedScore
                  ? formatScore(getPerformedScore(draftTask))
                  : 0
              }
              InputProps={{ readOnly: true }}
              sx={{
                ...drawerInputSx,
                "& .MuiInputBase-root": { bgcolor: "#f1f5f9" },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          <Box>
            <Typography
              sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}
            >
              Điểm thực tế
            </Typography>
            <TextField
              fullWidth
              size="small"
              value={
                formatScore && getActualScore
                  ? formatScore(getActualScore(draftTask))
                  : 0
              }
              InputProps={{ readOnly: true }}
              sx={{
                ...drawerInputSx,
                "& .MuiInputBase-root": { bgcolor: "#f1f5f9" },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          {/* Công tắc Vượt mức */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              p: 1.5,
              border: "1px solid #e2e8f0",
              borderRadius: 2,
              bgcolor: "#fff",
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {draftTask?.exceeded ? "Có vượt mức" : "Không vượt mức"}
            </Typography>

            <Switch
              checked={Boolean(draftTask?.exceeded)}
              onChange={(e) =>
                handleDraftChange("exceeded", e.target.checked)
              }
              color="success"
            />
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ flexShrink: 0 }} />

      {/* Footer */}
      <Box
        sx={{
          p: 2,
          bgcolor: "#fff",
          display: "flex",
          justifyContent: "flex-end",
          flexShrink: 0,
          boxShadow: "0 -4px 16px rgba(15,23,42,0.04)",
        }}
      >
        <Button
          variant="contained"
          startIcon={<CheckCircle />}
          onClick={handleComplete}
          sx={{
            px: 3,
            textTransform: "none",
            fontWeight: 700,
            borderRadius: 2,
            bgcolor: "#15803d",
            "&:hover": { bgcolor: "#166534" },
          }}
        >
          Hoàn tất
        </Button>
      </Box>
    </Dialog>
  );
}