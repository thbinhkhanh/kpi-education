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
  Chip,
  MenuItem,
} from "@mui/material";
import {
  AssignmentOutlined,
  Close,
  Delete,
  CheckCircle,
} from "@mui/icons-material";

export default function TaskCatalogDialog({
  open,
  selectedTask,
  tasks = [],
  onClose,
  onSaveTask, 
  onDeleteTask,
  UNIT_CODE,
  TYPES,
  AXES,
  STATUSES,
  inputSx,
}) {
  const [draftTask, setDraftTask] = useState(null);

  useEffect(() => {
    if (selectedTask) {
      setDraftTask({ ...selectedTask });
    } else {
      setDraftTask(null);
    }
  }, [selectedTask, open]);

  if (!draftTask) return null;

  const handleChange = (field, value) => {
    setDraftTask((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const convertedScore =
    Math.round(
      Number(draftTask.baseScore || 0) *
        Number(draftTask.difficultyFactor || 0) *
        100
    ) / 100;

  const handleComplete = () => {
    if (onSaveTask && draftTask) {
      onSaveTask(draftTask);
    }
    onClose();
  };

  const fieldLabelSx = {
    fontSize: "0.78rem",
    fontWeight: 700,
    mb: 0.75,
    color: "#334155",
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          width: { xs: "100%", sm: 520, md: 600 },
          maxWidth: "100%",
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

            <Typography
              sx={{
                fontSize: "0.75rem",
                color: "#cbd5e1",
                mt: 0.5,
              }}
            >
              STT {tasks.findIndex((t) => t.id === draftTask.id) + 1}
              {" · "}Chỉnh sửa thông tin
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

      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          boxSizing: "border-box",
        }}
      >
        <Box
          sx={{
            p: 2,
            mb: 2.5,
            bgcolor: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: "0.75rem", color: "#64748b" }}>
              ĐIỂM QUY ĐỔI TỐI ĐA
            </Typography>

            <Typography
              sx={{
                fontSize: "1.65rem",
                fontWeight: 800,
                color: "#1d4ed8",
              }}
            >
              {convertedScore.toLocaleString("vi-VN", {
                maximumFractionDigits: 2,
              })}
            </Typography>
          </Box>

          <Chip
            label={draftTask.status || "Hoạt động"}
            sx={{
              fontWeight: 700,
              height: "auto",
              bgcolor: "#e2e8f0",
              color: "#334155",
              "& .MuiChip-label": { whiteSpace: "normal", py: 0.75 },
            }}
          />
        </Box>

        <Typography
          sx={{
            fontSize: "0.85rem",
            fontWeight: 800,
            mb: 1.5,
            color: "#1e293b",
          }}
        >
          01. THÔNG TIN CÔNG VIỆC
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography sx={fieldLabelSx}>Mã đơn vị *</Typography>
            <TextField
              fullWidth
              size="small"
              value={draftTask.unitCode ?? UNIT_CODE}
              onChange={(e) => handleChange("unitCode", e.target.value)}
              placeholder="Nhập mã đơn vị"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Mã công việc</Typography>
            <TextField
              fullWidth
              size="small"
              value={draftTask.taskCode ?? ""}
              onChange={(e) => handleChange("taskCode", e.target.value)}
              placeholder="Nhập mã công việc"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Tên công việc *</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={draftTask.taskName ?? ""}
              onChange={(e) => handleChange("taskName", e.target.value)}
              placeholder="Nhập tên công việc"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Kết quả đầu ra *</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={draftTask.output ?? ""}
              onChange={(e) => handleChange("output", e.target.value)}
              placeholder="Mô tả kết quả đầu ra"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Thời hạn hoàn thành *</Typography>
            <TextField
              fullWidth
              size="small"
              value={draftTask.deadline ?? ""}
              onChange={(e) => handleChange("deadline", e.target.value)}
              placeholder="Nhập ngày / thời hạn"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Loại công việc *</Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={draftTask.type || (TYPES && TYPES[0]) || "Thường xuyên"}
              onChange={(e) => handleChange("type", e.target.value)}
              sx={inputSx}
            >
              {(TYPES || ["Thường xuyên", "Đột xuất"]).map((type) => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Divider />

          <Box>
            <Typography sx={fieldLabelSx}>Điểm chuẩn *</Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={draftTask.baseScore ?? ""}
              onChange={(e) => {
                const val = e.target.value === "" ? "" : Number(e.target.value);
                handleChange("baseScore", val);
              }}
              inputProps={{ min: 0, step: 0.1 }}
              placeholder="Nhập điểm chuẩn"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Hệ số độ khó (%) *</Typography>
            <TextField
              fullWidth
              size="small"
              type="number"
              value={
                draftTask.difficultyFactor === "" ||
                draftTask.difficultyFactor === undefined
                  ? ""
                  : Number(draftTask.difficultyFactor) * 100
              }
              onChange={(e) => {
                const val = e.target.value;
                handleChange(
                  "difficultyFactor",
                  val === "" ? "" : Number(val) / 100
                );
              }}
              inputProps={{ min: 0, step: 1 }}
              placeholder="Nhập hệ số (VD: 100)"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Điểm quy đổi tối đa</Typography>
            <TextField
              fullWidth
              size="small"
              value={convertedScore.toFixed(2)}
              InputProps={{ readOnly: true }}
              sx={{
                ...inputSx,
                "& .MuiInputBase-root": {
                  ...(inputSx?.["& .MuiInputBase-root"] || {}),
                  bgcolor: "#f1f5f9",
                },
                "& .MuiInputBase-input": { cursor: "default" },
              }}
            />
          </Box>

          <Divider />

          <Box>
            <Typography sx={fieldLabelSx}>Trục nhiệm vụ</Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={draftTask.axis ?? ""}
              onChange={(e) => handleChange("axis", e.target.value)}
              sx={{
                ...inputSx,
                "& .MuiSelect-select": {
                  whiteSpace: "normal",
                  lineHeight: 1.4,
                },
              }}
            >
              {(AXES || []).map((axis) => (
                <MenuItem
                  key={axis}
                  value={axis}
                  sx={{ whiteSpace: "normal", py: 1 }}
                >
                  {axis}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Trạng thái</Typography>
            <TextField
              select
              fullWidth
              size="small"
              value={draftTask.status || "Hoạt động"}
              onChange={(e) => handleChange("status", e.target.value)}
              sx={inputSx}
            >
              {(STATUSES || [
                "Hoạt động",
                "Chờ duyệt",
                "Đã nộp minh chứng",
                "Đã duyệt",
              ]).map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </TextField>
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Kỳ đánh giá</Typography>
            <TextField
              fullWidth
              size="small"
              value={draftTask.period ?? ""}
              onChange={(e) => handleChange("period", e.target.value)}
              placeholder="Nhập kỳ đánh giá"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Minh chứng</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={draftTask.evidence ?? ""}
              onChange={(e) => handleChange("evidence", e.target.value)}
              placeholder="Nhập minh chứng"
              sx={inputSx}
            />
          </Box>

          <Box>
            <Typography sx={fieldLabelSx}>Ghi chú</Typography>
            <TextField
              fullWidth
              size="small"
              multiline
              minRows={2}
              value={draftTask.note ?? ""}
              onChange={(e) => handleChange("note", e.target.value)}
              placeholder="Nhập ghi chú"
              sx={inputSx}
            />
          </Box>
        </Stack>
      </Box>

      <Divider sx={{ flexShrink: 0 }} />

      <Box
        sx={{
          p: 2,
          bgcolor: "#fff",
          display: "flex",
          gap: 1.5,
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 -4px 16px rgba(15,23,42,0.04)",
        }}
      >
        <Button
          variant="outlined"
          color="error"
          startIcon={<Delete />}
          onClick={() => {
            onDeleteTask?.(draftTask.id);
            onClose();
          }}
          sx={{ textTransform: "none", fontWeight: 700, borderRadius: 2 }}
        >
          Xóa nhiệm vụ
        </Button>

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