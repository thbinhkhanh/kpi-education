import React, { useEffect, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Chip,
  Tooltip,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { saveTaskEvaluation } from "../utils/saveTaskEvaluation";
import { useTaskCatalog } from "../contexts/TaskCatalogContext";

import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Close from "@mui/icons-material/Close";
import EditOutlined from "@mui/icons-material/EditOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import { Switch } from "@mui/material";
import Header from "./Header";
import { exportTaskEvaluationToExcel } from "../utils/exportTaskEvaluationToExcel";

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

// Các mức tỷ lệ theo quy định tại Phụ lục 4
const PROGRESS_OPTIONS = [
  { value: 100, label: "100% - Đúng/trước hạn" },
  { value: 80, label: "80% - Chậm 1-3 ngày" },
  { value: 60, label: "60% - Chậm 4-5 ngày" },
  { value: 0, label: "0% - Chậm >5 ngày/Không HT" },
];

const RESULT_OPTIONS = [
  { value: 100, label: "100% - Đạt đầy đủ yêu cầu" },
  { value: 80, label: "80% - Chỉnh sửa nhỏ" },
  { value: 60, label: "60% - Hoàn thành cơ bản" },
  { value: 0, label: "0% - Không đạt yêu cầu" },
];

const getDefaultProgress = (task) => {
  if (task.progressPercent !== undefined) return task.progressPercent;
  return 100;
};

const getDefaultResult = (task) => {
  if (task.resultPercent !== undefined) return task.resultPercent;
  return 100;
};

const getMaxScore = (task) =>
  round2(Number(task.baseScore || 0) * Number(task.difficultyFactor || 0));

const getPerformedScore = (task) => {
  const progress = Number(getDefaultProgress(task) || 0);
  const result = Number(getDefaultResult(task) || 0);

  return round2(
    Number(task.baseScore || 0) *
      ((progress * 0.3 + result * 0.7) / 100)
  );
};

const getActualScore = (task) =>
  round2(getPerformedScore(task) * Number(task.difficultyFactor || 0));

const formatScore = (value) =>
  Number(value).toLocaleString("vi-VN", {
    maximumFractionDigits: 2,
  });

export default forwardRef(function TaskEvaluation({
  tasks = [],
  onTasksChange,
  onKpiChange,
  onTaskStatsChange,
  selfEvaluation,
  quarter,               // <--- Thêm dòng này
  year,                  // <--- Thêm dòng này
  teacherName,           // <--- Thêm dòng này
  onQuarterChange,       // <--- Thêm dòng này
  onYearChange,          // <--- Thêm dòng này
  onTeacherNameChange,   // <--- Thêm dòng này
}, ref) {
  const updateTask = (id, field, value) => {
    onTasksChange?.((previous) =>
      previous.map((task) =>
        task.id === id ? { ...task, [field]: value } : task
      )
    );
  };

  const totalA = round2(
    tasks.reduce((sum, task) => sum + getMaxScore(task), 0)
  );

  const totalB = round2(
    tasks.reduce((sum, task) => sum + getActualScore(task), 0)
  );

  const rawKpi = totalA > 0 ? (70 * totalB) / totalA : 0;
  const kpi = round2(totalB > totalA ? 70 : rawKpi);
  const [saving, setSaving] = useState(false);

  // Khai báo state quản lý Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const [headerData, setHeaderData] = useState(null);
  const { taskCatalogCache } = useTaskCatalog();

  const [selectedTask, setSelectedTask] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeTask = tasks.find((task) => task.id === selectedTask?.id) || selectedTask;

  const handleCloseDrawer = () => {
    setSelectedTask(null);
    setDrawerOpen(false);
  };

  const handleHeaderChange = useCallback((data) => {
    setHeaderData(data);
  }, []);

  useEffect(() => {
    // Ưu tiên lấy trực tiếp từ props cha truyền xuống, nếu chưa có mới fallback về headerData
    const currentYear = year || headerData?.year;
    const currentQuarter = quarter || headerData?.quarter;
    const currentTeacherName = teacherName || headerData?.personalInfo
      ?.find((item) => item.label?.trim() === "Họ và tên")
      ?.value?.trim();

    if (!currentYear || !currentQuarter || !currentTeacherName) return;

    let cancelled = false;

    const loadEvaluation = async () => {
      try {
        const cacheKey = `${String(currentYear)}_Q${String(
          currentQuarter
        )}_${currentTeacherName}`;

        const catalogTasks = taskCatalogCache[cacheKey];

        const snapshot = await getDoc(
          doc(db, "KPI_TASK_EVALUATION", cacheKey)
        );

        if (cancelled) return;

        const evaluationTasks =
          snapshot.exists() && Array.isArray(snapshot.data().tasks)
            ? snapshot.data().tasks
            : [];

        if (Array.isArray(catalogTasks)) {
          const evaluationMap = new Map(
            evaluationTasks.map((task) => [task.id, task])
          );

          const mergedTasks = catalogTasks.map((task) => {
            const evaluation = evaluationMap.get(task.id) || {};

            return {
              ...task,
              progressPercent: evaluation.progressPercent ?? 100,
              resultPercent: evaluation.resultPercent ?? 100,
              exceeded: evaluation.exceeded ?? evaluation.exceedsTarget ?? false,
            };
          });

          onTasksChange?.(mergedTasks);
        } else if (evaluationTasks.length > 0) {
          onTasksChange?.(evaluationTasks);
        } else {
          // Nếu đổi năm/quý mà chưa có dữ liệu trong catalog hoặc evaluation, reset về mảng trống
          onTasksChange?.([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Lỗi tải đánh giá KPI:", error);
        }
      }
    };

    loadEvaluation();

    return () => {
      cancelled = true;
    };
  }, [
    year,
    quarter,
    teacherName,
    headerData?.year,
    headerData?.quarter,
    headerData?.personalInfo,
    taskCatalogCache,
    onTasksChange,
  ]);

  useEffect(() => {
    onKpiChange?.(kpi);

    const totalTasks = tasks.length;

    const completedTasks = tasks.filter(
      (task) =>
        Number(getDefaultProgress(task)) === 100 &&
        Number(getDefaultResult(task)) === 100
    ).length;

    const exceededTasks = tasks.filter(
      (task) => task.exceeded === true
    ).length;

    onTaskStatsChange?.({
      totalTasks,
      completedTasks,
      exceededTasks,
    });
  }, [tasks, kpi, onKpiChange, onTaskStatsChange]);

  const handleSaveEvaluation = async () => {
    const teacherName = headerData?.personalInfo?.find(
      (item) => item.label?.trim() === "Họ và tên"
    )?.value?.trim();

    if (!headerData?.year || !headerData?.quarter || !teacherName) {
      setSnackbar({
        open: true,
        message: "Vui lòng kiểm tra năm, quý và họ tên giáo viên.",
        severity: "warning",
      });
      return;
    }

    setSaving(true);

    try {      
      await saveTaskEvaluation({
        year: headerData.year,
        quarter: headerData.quarter,
        teacherId: teacherName,
        groupAScore: totalA,
        groupBScore: totalB,
        totalScore: kpi,
        classification: "",
        tasks: tasks.map((task) => ({
          ...task,
          progressPercent: Number(getDefaultProgress(task)),
          resultPercent: Number(getDefaultResult(task)),
          executionScore: getPerformedScore(task),
          actualScore: getActualScore(task),
          exceedsTarget: Boolean(task.exceeded),
        })),
      });

      setSnackbar({
        open: true,
        message: "Lưu thành công!",
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi lưu đánh giá KPI:", error);
      setSnackbar({
        open: true,
        message: `Lưu thất bại: ${error.message}`,
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    save: handleSaveEvaluation,
    exportExcel: async () => {
      // 1. Kiểm tra nếu không có dữ liệu thì thông báo và dừng lại, không xuất file
      if (!tasks || tasks.length === 0) {
        setSnackbar({
          open: true,
          message: "Danh sách đánh giá đang trống. Không thể xuất file Excel!",
          severity: "warning",
        });
        return;
      }

      try {
        await exportTaskEvaluationToExcel(tasks, `Bang_danh_gia_KPI.xlsx`);
        setSnackbar({
          open: true,
          message: "Xuất file Excel thành công!",
          severity: "success",
        });
      } catch (error) {
        console.error("Lỗi xuất Excel:", error);
        setSnackbar({
          open: true,
          message: error.message || "Không thể xuất file Excel.",
          severity: "error",
        });
      }
    }
  }));

  const headerSx = {
    bgcolor: "#1e3a8a",
    color: "#fff",
    fontWeight: 800,
    fontSize: "0.78rem",
    textAlign: "center",
    verticalAlign: "middle",
    whiteSpace: "normal",
    lineHeight: 1.5,
    px: 1.25,
    py: 1.5,
    border: "1px solid #cbd5e1",
  };

  const cellSx = {
    px: 1.25,
    py: 1.25,
    fontSize: "0.8rem",
    verticalAlign: "middle",
    border: "1px solid #e2e8f0",
  };

  const numberSx = {
    ...cellSx,
    textAlign: "center",
    whiteSpace: "nowrap",
    fontVariantNumeric: "tabular-nums",
  };

  const selectField = (task, field, value, options) => (
    <TextField
      select
      size="small"
      value={value}
      onChange={(event) => {
        updateTask(task.id, field, Number(event.target.value));
      }}
      sx={{
        width: 110,
        "& .MuiInputBase-root": {
          fontSize: "0.75rem",
          bgcolor: "#fff",
          borderRadius: 1.5,
        },
        "& .MuiSelect-select": {
          py: 1,
          px: 1,
        },
      }}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value} sx={{ fontSize: "0.75rem" }}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );

  const drawerInputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 1.5,
      bgcolor: "#fff",
      fontSize: "0.875rem",
      "& fieldset": {
        borderColor: "#cbd5e1",
      },
      "&:hover fieldset": {
        borderColor: "#94a3b8",
      },
      "&.Mui-focused fieldset": {
        borderColor: "#1976d2",
      },
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.875rem",
    },
  };

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
        p: { xs: 0, sm: 1, md: 2 },
        color: '#334155',
        bgcolor: '#f1f5f9',
        minHeight: '100%',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          border: '1px solid #e2e8f0',
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: '#fff',
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.045)',
        }}
      >
        <Header 
          quarter={quarter}
          year={year}
          teacherName={teacherName}
          onQuarterChange={onQuarterChange}
          onYearChange={onYearChange}
          onTeacherNameChange={onTeacherNameChange}
          onChange={handleHeaderChange} 
        />
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: "1.1rem",
              fontWeight: 800,
              color: "#1e3a8a",
              mb: 1,
            }}
          >
            BẢNG ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN NHIỆM VỤ (KPI)
          </Typography>

          <Typography
            sx={{
              fontSize: "0.875rem",
              color: "#64748b",
              fontStyle: "italic",
              lineHeight: 1.8,
            }}
          >
            Đánh giá theo hướng dẫn tại Phụ lục 4 (Tiến độ chiếm 30%, Chất lượng chiếm 70%).
          </Typography>
        </Box>

        <TableContainer
          component={Paper}
          variant="outlined"
          sx={{
            borderRadius: 2,
            overflowX: "auto",
            "&::-webkit-scrollbar": { height: 8 },
            "&::-webkit-scrollbar-thumb": {
              bgcolor: "#cbd5e1",
              borderRadius: 10,
            },
          }}
        >
          <Table
            size="small"
            stickyHeader
            sx={{
              minWidth: 1250,
              tableLayout: "fixed",
              "& .MuiTableCell-root": { borderColor: "#e2e8f0" },
              "& .MuiTableHead-root .MuiTableCell-root": {
                bgcolor: "#1e3a8a",
              },
            }}
          >
            <colgroup>
              {[55, 430, 100, 100, 100, 150, 150, 100, 100, 100].map(
                (width, index) => (
                  <col key={index} style={{ width }} />
                )
              )}
            </colgroup>

            <TableHead>
              <TableRow>
                {[
                  "STT",
                  "Tên công việc",
                  "Điểm chuẩn",
                  "Hệ số độ khó",
                  "Điểm tối đa",
                  "Tiến độ %",
                  "Kết quả %",
                  "Điểm thực hiện",
                  "Điểm thực tế",
                  "Vượt mức",
                ].map((label) => (
                  <TableCell key={label} align="center" sx={headerSx}>
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {tasks.map((task, index) => {
                const progress = getDefaultProgress(task);
                const result = getDefaultResult(task);
                const performed = getPerformedScore(task);
                const actual = getActualScore(task);
                const exceeded = task.exceeded ?? false;

                return (
                <TableRow
                  key={task.id}
                  hover
                  onClick={() => {
                    setSelectedTask(task);
                    setDrawerOpen(true);
                  }}
                  sx={{ cursor: "pointer" }}
                >
                    <TableCell align="center" sx={cellSx}>
                      {index + 1}
                    </TableCell>

                    <TableCell sx={cellSx}>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 400,
                          lineHeight: 1.7,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {task.taskName || ""}
                      </Typography>
                    </TableCell>

                    <TableCell sx={numberSx}>
                      {formatScore(task.baseScore || 0)}
                    </TableCell>

                    <TableCell sx={numberSx}>
                      {formatScore(Number(task.difficultyFactor || 0) * 100)}%
                    </TableCell>

                    <TableCell sx={numberSx}>
                      <Typography sx={{ fontWeight: 800, color: "#1d4ed8" }}>
                        {formatScore(getMaxScore(task))}
                      </Typography>
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={cellSx}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectField(
                        task,
                        "progressPercent",
                        progress,
                        PROGRESS_OPTIONS
                      )}
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={cellSx}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {selectField(
                        task,
                        "resultPercent",
                        result,
                        RESULT_OPTIONS
                      )}
                    </TableCell>

                    <TableCell sx={numberSx}>
                      {formatScore(performed)}
                    </TableCell>

                    <TableCell sx={numberSx}>
                      <Typography sx={{ fontWeight: 800, color: "#15803d" }}>
                        {formatScore(actual)}
                      </Typography>
                    </TableCell>

                    <TableCell
                      align="center"
                      sx={cellSx}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip title="Đánh dấu nhiệm vụ vượt mức">
                        <Chip
                          label={exceeded ? "X" : "—"}
                          size="small"
                          onClick={() =>
                            updateTask(task.id, "exceeded", !exceeded)
                          }
                          sx={{
                            minWidth: 32,
                            fontWeight: 800,
                            cursor: "pointer",
                            bgcolor: exceeded ? "#dcfce7" : "#f1f5f9",
                            color: exceeded ? "#166534" : "#64748b",
                            border: "1px solid",
                            borderColor: exceeded ? "#bbf7d0" : "#cbd5e1",
                            "&:hover": {
                              bgcolor: exceeded ? "#bbf7d0" : "#e2e8f0",
                            },
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}

              <TableRow sx={{ bgcolor: "#eff6ff" }}>
                <TableCell
                  colSpan={4}
                  sx={{
                    ...cellSx,
                    fontWeight: 800,
                    color: "#1e3a8a",
                  }}
                >
                  TỔNG ĐIỂM QUY ĐỔI (A VÀ B)
                </TableCell>

                <TableCell
                  sx={{ ...numberSx, fontWeight: 800, color: "#1d4ed8" }}
                >
                  {formatScore(totalA)}
                </TableCell>

                <TableCell colSpan={3} sx={cellSx} />

                <TableCell
                  sx={{ ...numberSx, fontWeight: 800, color: "#15803d" }}
                >
                  {formatScore(totalB)}
                </TableCell>
              </TableRow>

              <TableRow sx={{ bgcolor: "#faf5ff" }}>
                <TableCell
                  colSpan={8}
                  sx={{
                    ...cellSx,
                    fontWeight: 800,
                    color: "#581c87",
                  }}
                >
                  ĐIỂM KPI ĐẠT ĐƯỢC
                  <Typography
                    component="div"
                    sx={{
                      mt: 0.25,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#7e22ce",
                    }}
                  >
                    KPI = 70 × (B/A)
                  </Typography>
                </TableCell>

                <TableCell
                  sx={{
                    ...numberSx,
                    fontWeight: 900,
                    fontSize: "1.1rem",
                    color: "#7e22ce",
                    bgcolor: "#f3e8ff",
                    border: "2px solid #c084fc",
                  }}
                >
                  {formatScore(kpi)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        
        <Drawer
          anchor="right"
          open={Boolean(selectedTask)}
          onClose={handleCloseDrawer}
          PaperProps={{
            sx: {
              width: { xs: "100%", sm: 600, md: 750, lg: 900 },
              maxWidth: "100%",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              bgcolor: "#f8fafc",
            },
          }}
        >
          {selectedTask && (
            <>
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
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", minWidth: 0 }}>
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
                      STT {tasks.findIndex((t) => t.id === selectedTask.id) + 1}
                      {" · "}Chỉnh sửa đánh giá
                    </Typography>
                  </Box>
                </Box>

                <IconButton
                  onClick={handleCloseDrawer}
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
                <Stack spacing={2}>
                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      STT
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={tasks.findIndex((t) => t.id === selectedTask.id) + 1}
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...drawerInputSx,
                        "& .MuiInputBase-root": {
                          ...drawerInputSx["& .MuiInputBase-root"],
                          bgcolor: "#f1f5f9",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "default",
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Tên công việc
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      multiline
                      value={selectedTask.taskName ?? ""}
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...drawerInputSx,
                        "& .MuiInputBase-root": {
                          ...drawerInputSx["& .MuiInputBase-root"],
                          bgcolor: "#f1f5f9",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "default",
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Điểm chuẩn
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={formatScore(selectedTask.baseScore ?? 0)}
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...drawerInputSx,
                        "& .MuiInputBase-root": {
                          ...drawerInputSx["& .MuiInputBase-root"],
                          bgcolor: "#f1f5f9",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "default",
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Hệ số độ khó (%)
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={formatScore(Number(selectedTask.difficultyFactor ?? 1) * 100)}
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...drawerInputSx,
                        "& .MuiInputBase-root": {
                          ...drawerInputSx["& .MuiInputBase-root"],
                          bgcolor: "#f1f5f9",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "default",
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Điểm tối đa
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={formatScore(getMaxScore(selectedTask))}
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...drawerInputSx,
                        "& .MuiInputBase-root": {
                          ...drawerInputSx["& .MuiInputBase-root"],
                          bgcolor: "#f1f5f9",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "default",
                        },
                      }}
                    />
                  </Box>

                  <Box sx={{ width: "100%", minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Tiến độ %
                    </Typography>
                    <Box
                      sx={{
                        width: "100%",
                        "& .MuiFormControl-root": { width: "100%" },
                      }}
                    >
                      {selectField(
                        selectedTask,
                        "progressPercent",
                        getDefaultProgress(selectedTask),
                        PROGRESS_OPTIONS,
                        true
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ width: "100%", minWidth: 0 }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Kết quả %
                    </Typography>
                    <Box
                      sx={{
                        width: "100%",
                        "& .MuiFormControl-root": { width: "100%" },
                      }}
                    >
                      {selectField(
                        selectedTask,
                        "resultPercent",
                        getDefaultResult(selectedTask),
                        RESULT_OPTIONS,
                        true
                      )}
                    </Box>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Điểm thực hiện
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={formatScore(getPerformedScore(selectedTask))}
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...drawerInputSx,
                        "& .MuiInputBase-root": {
                          ...drawerInputSx["& .MuiInputBase-root"],
                          bgcolor: "#f1f5f9",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "default",
                        },
                      }}
                    />
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, mb: 0.75 }}>
                      Điểm thực tế
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      value={formatScore(getActualScore(selectedTask))}
                      InputProps={{ readOnly: true }}
                      sx={{
                        ...drawerInputSx,
                        "& .MuiInputBase-root": {
                          ...drawerInputSx["& .MuiInputBase-root"],
                          bgcolor: "#f1f5f9",
                        },
                        "& .MuiInputBase-input": {
                          cursor: "default",
                        },
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      p: 0.5,
                      border: "1px solid #e2e8f0",
                      borderRadius: 2,
                      bgcolor: "#fff",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {activeTask?.exceeded ? "Có vượt mức" : "Không vượt mức"}
                    </Typography>

                    <Switch
                      checked={Boolean(activeTask?.exceeded)}
                      onChange={(e) => {
                        if (!activeTask) return;
                        updateTask(activeTask.id, "exceeded", e.target.checked);
                      }}
                      color="success"
                    />
                  </Box>
                </Stack>
              </Box>

              <Divider />

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
                  //startIcon={<SaveOutlined />}
                  onClick={handleCloseDrawer}
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
            </>
          )}
        </Drawer>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 600, fontSize: "0.85rem" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
});