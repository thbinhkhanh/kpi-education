import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from "react";
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
  Button,
  Chip,
  Stack,
  TextField,
  MenuItem,
  IconButton,
  InputAdornment,
  Snackbar,
  Alert,
  Dialog,
} from "@mui/material";

import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

import Add from "@mui/icons-material/Add";
import Delete from "@mui/icons-material/Delete";
import DescriptionOutlined from "@mui/icons-material/DescriptionOutlined";
import HourglassEmpty from "@mui/icons-material/HourglassEmpty";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import TrendingUp from "@mui/icons-material/TrendingUp";
import Header from "./Header";

import SaveOutlined from "@mui/icons-material/SaveOutlined";
import { saveTaskCatalog } from "../utils/saveTaskCatalog";
import { useTaskCatalog } from "../contexts/TaskCatalogContext";

import Drawer from "@mui/material/Drawer";
import Divider from "@mui/material/Divider";
import Close from "@mui/icons-material/Close";
import EditOutlined from "@mui/icons-material/EditOutlined";

import { importTaskCatalog } from "../utils/importTaskCatalog";
import { exportTaskCatalogWithExcelJS } from "../utils/exportTaskCatalogExcelJS";

import TaskCatalogDialog from "./TaskCatalogDialog";
import TaskAddDialog from "./TaskAddDialog";

const UNIT_CODE = "H29.233.11";
const DEFAULT_PERIOD = "(Daotao 15/08)_KPI-Q3-2026";

const AXES = [
    "Trục 1 - Thực hiện mục tiêu phát triển kinh tế - xã hội và nhiệm vụ chính trị được giao",
    "Trục 2 - Hoàn thiện thể chế, đẩy mạnh phân cấp, phân quyền gắn với kiểm tra, giám sát",
    "Trục 3 - Thúc đẩy phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số",
    "Trục 4 - Xây dựng Đảng và hệ thống chính trị trong sạch, vững mạnh; giữ gìn đoàn kết, thống nhất nội bộ; phòng, chống tham nhũng, lãng phí, tiêu cực",
    "Trục 5 - Phát triển văn hóa, con người, bảo đảm an sinh xã hội, nâng cao đời sống nhân dân",
    "Trục 6 - Củng cố quốc phòng, an ninh, giữ vững ổn định chính trị - xã hội, nâng cao hiệu quả đối ngoại và hội nhập quốc tế",
];

const STATUSES = [
  "Hoạt động",
  "Chờ duyệt",
  "Đã nộp minh chứng",
  "Đã duyệt",
];

const TYPES = ["Thường xuyên", "Đột xuất"];

const getConvertedScore = (task) =>
  Math.round(
    Number(task.baseScore || 0) *
      Number(task.difficultyFactor || 0) *
      100
  ) / 100;

export default forwardRef(function TaskCatalog({
  activeTab = "catalog",
  onScoreChange,
  tasks: sharedTasks,
  onTasksChange,
  quarter,              
  year,                 
  teacherName: propTeacherName, // <--- Đổi tên prop nhận vào
  onQuarterChange,      
  onYearChange,         
  onTeacherNameChange,  
}, ref) {
  const [localTasks, setLocalTasks] = useState([]);
  const [headerData, setHeaderData] = useState(null);

  const handleHeaderChange = useCallback((data) => {
    setHeaderData(data);
  }, []);

  const tasks = sharedTasks ?? localTasks;
  const setTasks = onTasksChange ?? setLocalTasks;

  const { taskCatalogCache, setTaskCatalogCache } = useTaskCatalog();

  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Thêm state này vào danh sách useState
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const selectedTask = tasks.find(
    (task) => task.id === selectedTaskId
  );

  const handleOpenDrawer = (task) => {
    setSelectedTaskId(task.id);
  };

  const handleCloseDrawer = () => {
    setSelectedTaskId(null);
  };

  // Ưu tiên lấy teacherName từ props, nếu không có mới lấy từ headerData
  const teacherName = propTeacherName || headerData?.personalInfo?.find(
    (item) => item.label?.trim() === "Họ và tên"
  )?.value?.trim();

  const cacheKey =
    headerData?.year && headerData?.quarter && teacherName
        ? `${String(headerData.year)}_Q${String(
            headerData.quarter
        )}_${String(teacherName).trim()}`
        : "";

  const loadedKeyRef = useRef("");

  useEffect(() => {
    if (!cacheKey) return;

    let cancelled = false;

    const loadTasks = async () => {
      try {
        // 1. Nếu đã có trong Context Cache và chưa ép tải lại thì dùng luôn
        if (
          !cancelled &&
          loadedKeyRef.current !== cacheKey &&
          Object.prototype.hasOwnProperty.call(taskCatalogCache, cacheKey)
        ) {
          setTasks(taskCatalogCache[cacheKey]);
          loadedKeyRef.current = cacheKey;
          return;
        }

        // 2. Luôn gọi fetch từ Firestore để đảm bảo lấy dữ liệu mới nhất trên thiết bị di động
        const snapshot = await getDoc(
          doc(db, "KPI_TASK_CATALOG", cacheKey)
        );

        if (cancelled) return;

        const data = snapshot.exists() ? snapshot.data() : {};
        const loadedTasks = Array.isArray(data.tasks) ? data.tasks : [];

        setTasks(loadedTasks);
        setTaskCatalogCache((prev) => ({
          ...prev,
          [cacheKey]: loadedTasks,
        }));

        loadedKeyRef.current = cacheKey;
      } catch (error) {
        if (!cancelled) {
          console.error("Lỗi tải danh mục nhiệm vụ:", error);
        }
      }
    };

    loadTasks();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, setTasks, setTaskCatalogCache]);

  const totalScore = tasks.reduce(
    (sum, task) => sum + getConvertedScore(task),
    0
  );

  const finalGroupBScore = Math.min(70, Math.max(0, totalScore));

  useEffect(() => {
    onScoreChange?.(finalGroupBScore);
  }, [finalGroupBScore, onScoreChange]);

  const submittedCount = tasks.filter(
    (task) => task.status === "Đã nộp minh chứng"
  ).length;

  const approvedCount = tasks.filter(
    (task) => task.status === "Đã duyệt"
  ).length;

  const pendingCount = tasks.length - submittedCount - approvedCount;

  const headerCellSx = {
    bgcolor: "#f1f5f9",
    color: "#334155",
    fontSize: "0.78rem",
    fontWeight: 800,
    whiteSpace: "normal",
    lineHeight: 1.5,
    py: 1.5,
    px: 1,
    borderColor: "#e2e8f0",
    verticalAlign: "middle",
  };

  const bodyCellSx = {
    px: 1,
    py: 1.25,
    borderColor: "#e8edf4",
    verticalAlign: "top",
  };

  const inputSx = {
    "& .MuiInputBase-root": {
      fontSize: "0.78rem",
      bgcolor: "#fff",
      borderRadius: 1.5,
    },
    "& .MuiInputBase-input": {
      px: 1,
      py: 1,
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: "#cbd5e1",
    },
  };

  const handleAddTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        id: Math.max(0, ...prev.map((task) => task.id)) + 1,
        unitCode: UNIT_CODE,
        taskName: "",
        output: "",
        deadline: "",
        type: "Thường xuyên",
        baseScore: 10,
        difficultyFactor: 1,
        evidence: "",
        note: "",
        axis: AXES[0],
        status: "Hoạt động",
        period: DEFAULT_PERIOD,
      },
    ]);
  };

  const handleUpdateTask = (updatedTaskOrId, field, value) => {
    setTasks((prev) => {
      const updatedTasks = prev.map((task) => {
        if (typeof updatedTaskOrId === "object" && updatedTaskOrId !== null) {
          return task.id === updatedTaskOrId.id ? updatedTaskOrId : task;
        }
        if (task.id !== updatedTaskOrId) return task;
        return { ...task, [field]: value };
      });

      // Cập nhật đồng thời vào cache của Context để lưu trạng thái ngay lập tức
      if (cacheKey) {
        setTaskCatalogCache((prevCache) => ({
          ...prevCache,
          [cacheKey]: updatedTasks,
        }));
      }

      return updatedTasks;
    });
  };

  const handleDeleteTask = (id) => {
    setTasks((prev) => {
      const updatedTasks = prev.filter((task) => task.id !== id);

      // Cập nhật lại cache trong Context và localStorage ngay sau khi xóa
      if (cacheKey) {
        setTaskCatalogCache((prevCache) => ({
          ...prevCache,
          [cacheKey]: updatedTasks,
        }));
      }

      return updatedTasks;
    });
  };

  const fileInputRef = useRef(null);

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const importedTasks = await importTaskCatalog(file);
      setTasks(importedTasks);
      setSnackbar({
        open: true,
        message: `Đã nhập ${importedTasks.length} nhiệm vụ. Vui lòng lưu để cập nhật Firestore.`,
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi nhập Excel:", error);

      setSnackbar({
        open: true,
        message: error.message || "Không thể đọc file Excel.",
        severity: "error",
      });
    } finally {
      event.target.value = "";
    }
  };


  const handleExportClick = () => {
    try {
      exportTaskCatalogToExcel(tasks, `Danh_muc_nhiem_vu_Q3_2026.xlsx`);
      setSnackbar({
        open: true,
        message: "Xuất file Excel thành công!",
        severity: "success",
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || "Xuất file thất bại.",
        severity: "error",
      });
    }
  };

  const getStatusStyle = (status) => {
    if (status === "Đã duyệt") {
      return { bgcolor: "#dbeafe", color: "#1d4ed8" };
    }
    if (status === "Đã nộp minh chứng") {
      return { bgcolor: "#dcfce7", color: "#166534" };
    }
    if (status === "Hoạt động") {
      return { bgcolor: "#e0f2fe", color: "#075985" };
    }
    return { bgcolor: "#fef3c7", color: "#92400e" };
  };

  const renderText = (task, field, placeholder, index, options = {}) => (
    <TextField
      fullWidth
      size="small"
      value={task[field] ?? ""}
      onChange={(event) =>
        handleUpdateTask(task.id, field, event.target.value)
      }
      placeholder={placeholder}
      multiline={options.multiline ?? false}
      minRows={options.minRows ?? 1}
      type={options.type || "text"}
      sx={inputSx}
    />
  );

  const renderSelect = (task, field, values) => (
    <TextField
        select
        fullWidth
        size="small"
        value={task[field] || ""}
        onChange={(event) =>
        handleUpdateTask(task.id, field, event.target.value)
        }
        sx={{
        ...inputSx,
        ...(field === "axis" && {
            "& .MuiInputBase-root": {
            ...inputSx["& .MuiInputBase-root"],
            minHeight: 56,
            alignItems: "flex-start",
            },
            "& .MuiSelect-select": {
            whiteSpace: "normal",
            lineHeight: 1.4,
            py: 1,
            },
        }),
        }}
    >
        {values.map((value) => (
        <MenuItem key={value} value={value} sx={{ whiteSpace: "normal" }}>
            {value}
        </MenuItem>
        ))}
    </TextField>
  );

  // Khai báo state quản lý Snackbar
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // "success" | "error" | "warning" | "info"
  });

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSaveTasks = async () => {
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

    try {
        await saveTaskCatalog({
            year: headerData.year,
            quarter: headerData.quarter,
            teacherId: teacherName,
            tasks,
        });

        setTaskCatalogCache((prev) => ({
            ...prev,
            [cacheKey]: tasks,
        }));

        setSnackbar({
          open: true,
          message: "Lưu thành công!",
          severity: "success",
        });
    } catch (error) {
        console.error("Lỗi lưu danh mục nhiệm vụ:", error);
        setSnackbar({
          open: true,
          message: `Lưu thất bại: ${error.message}`,
          severity: "error",
        });
    }
  };

  // Cấu hình ref để App.js có thể gọi hàm lưu và import Excel từ bên ngoài
  // Cấu hình ref để App.js có thể gọi hàm save, importExcel và exportExcel từ bên ngoài
  useImperativeHandle(ref, () => ({
    save: handleSaveTasks,
    importExcel: async (file) => {
      try {
        const importedTasks = await importTaskCatalog(file);
        setTasks(importedTasks);

        // Lưu ngay vào cache để không bị useEffect ghi đè mất
        if (cacheKey) {
          setTaskCatalogCache((prev) => ({
            ...prev,
            [cacheKey]: importedTasks,
          }));
        }

        setSnackbar({
          open: true,
          message: `Đã nhập ${importedTasks.length} nhiệm vụ từ Excel. Vui lòng nhấn "Lưu trang này" để cập nhật!`,
          severity: "success",
        });
      } catch (error) {
        console.error("Lỗi nhập Excel:", error);
        setSnackbar({
          open: true,
          message: error.message || "Không thể đọc file Excel.",
          severity: "error",
        });
      }
    },
    exportExcel: async () => {
      // 1. Kiểm tra nếu không có dữ liệu thì thông báo và dừng lại, không xuất file
      if (!tasks || tasks.length === 0) {
        setSnackbar({
          open: true,
          message: "Danh sách nhiệm vụ đang trống. Không thể xuất file Excel!",
          severity: "warning",
        });
        return;
      }

      try {
        await exportTaskCatalogWithExcelJS(tasks, `Danh_muc_nhiem_vu_Q3_2026.xlsx`);
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

  // Hàm xử lý khi thêm nhiệm vụ mới từ Dialog
  // Hàm xử lý khi thêm nhiệm vụ mới từ Dialog
  const handleAddTaskSubmit = (newTaskData) => {
    setTasks((prev) => {
      const newId = Math.max(0, ...prev.map((task) => task.id)) + 1;
      const taskToAdd = {
        ...newTaskData,
        id: newId,
      };

      const updatedTasks = [...prev, taskToAdd];

      if (cacheKey) {
        setTaskCatalogCache((prevCache) => ({
          ...prevCache,
          [cacheKey]: updatedTasks,
        }));
      }

      return updatedTasks;
    });

    setSnackbar({
      open: true,
      message: "Đã thêm nhiệm vụ mới thành công!",
      severity: "success",
    });
  };

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1600,
        mx: "auto",
        p: { xs: 0, sm: 1, md: 2 },
        textAlign: "left",
        color: "#334155",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          border: "1px solid #e2e8f0",
          borderRadius: { xs: 2, sm: 3 },
          bgcolor: "#fff",
          boxShadow: "0 8px 30px rgba(15, 23, 42, 0.045)",
        }}
      >
        <Header 
          activeTab={activeTab}
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
            II. ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN NHIỆM VỤ
          </Typography>

          <Typography
            sx={{
              fontSize: "0.875rem",
              color: "#64748b",
              fontStyle: "italic",
              lineHeight: 1.8,
            }}
          >
            Trên cơ sở nhiệm vụ được giao, cá nhân đánh giá kết quả thực hiện
            nhiệm vụ theo các tiêu chí của nhóm B như sau:
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          {/* THANH TIÊU ĐỀ CHÍNH TRÊN CÙNG BẢNG */}
          {/* THANH TIÊU ĐỀ CHÍNH TRÊN CÙNG BẢNG */}
          <Box
            sx={{
              p: { xs: 1.5, sm: 2 },
              display: "flex",
              justifyContent: "space-between", // <--- Thêm dòng này để đẩy Chip sang lề phải
              alignItems: "center",
              gap: 1.25,
              color: "#fff",
              bgcolor: "#172554",
              borderRadius: "10px 10px 0 0",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                minWidth: 0,
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "rgba(255,255,255,0.13)",
                  borderRadius: 1.5,
                }}
              >
                <AssignmentOutlined />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: { xs: "0.8rem", sm: "0.9rem" },
                    fontWeight: 800,
                    lineHeight: 1.6,
                  }}
                >
                  DANH MỤC SẢN PHẨM, NHIỆM VỤ ĐƯỢC GIAO
                </Typography>
              </Box>
            </Box>

            {/* CHIP HIỂN THỊ ĐIỂM ĐẠT TRÊN THANH TIÊU ĐỀ */}
            <Chip
              label={`Điểm đạt: ${finalGroupBScore.toFixed(1)} / 70`}
              size="small"
              sx={{
                height: 30,
                bgcolor: "rgba(255,255,255,0.13)",
                color: "#fff",
                borderRadius: 1.5,
                fontWeight: 800,
                "& .MuiChip-label": { px: 1.5 },
              }}
            />
          </Box>
          
          <TableContainer
            component={Paper}
            elevation={0}
            variant="outlined"
            sx={{
              borderColor: "#e2e8f0",
              borderRadius: "0 0 8px 8px",
              overflowX: "auto",
              "&::-webkit-scrollbar": { height: 7 },
              "&::-webkit-scrollbar-thumb": {
                bgcolor: "#cbd5e1",
                borderRadius: 10,
              },
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: 1250,
                tableLayout: "fixed",
                "& .MuiTableCell-root": {
                  borderColor: "#e8edf4",
                },
              }}
            >
              <colgroup>
                {[60, 500, 200, 100, 150, 100, 100, 100].map((width, index) => (
                  <col key={index} style={{ width }} />
                ))}
              </colgroup>

              <TableHead>
                <TableRow>
                  {[
                    "STT",
                    "Tên công việc *",
                    "Kết quả đầu ra *",
                    "Thời hạn hoàn thành *",
                    "Loại công việc *",
                    "Điểm chuẩn *",
                    "Hệ số độ khó *",
                    "Điểm quy đổi tối đa *",
                  ].map((label, index) => (
                    <TableCell
                      key={label}
                      align="center"
                      sx={{
                        ...headerCellSx,
                        position: index === 0 ? "sticky" : "static",
                        left: index === 0 ? 0 : "auto",
                        zIndex: index === 0 ? 3 : 1,
                        bgcolor: "#f1f5f9",
                      }}
                    >
                      {label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {tasks.map((task, index) => (
                  <TableRow
                    key={task.id}
                    hover
                    onClick={() => handleOpenDrawer(task)}
                    sx={{
                      cursor: "pointer",
                      transition: "background-color 0.15s",
                      "&:hover": {
                        bgcolor: "#eff6ff !important",
                      },
                      "& td": {
                        py: 1.5,
                      },
                    }}
                  >
                    <TableCell
                      align="center"
                      sx={{
                        ...bodyCellSx,
                        position: "sticky",
                        left: 0,
                        zIndex: 2,
                        bgcolor: "#fff",
                        fontWeight: 800,
                        color: "#64748b",
                        boxShadow: "2px 0 4px rgba(15,23,42,0.04)",
                      }}
                    >
                      {index + 1}
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                        <Box
                          sx={{
                            width: 34,
                            height: 34,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: 1.5,
                            bgcolor: "#dbeafe",
                            color: "#1d4ed8",
                          }}
                        >
                          <AssignmentOutlined fontSize="small" />
                        </Box>

                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography
                            sx={{
                              fontSize: "0.85rem",
                              fontWeight: 750,
                              color: "#1e293b",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {task.taskName || "Chưa nhập tên nhiệm vụ"}
                          </Typography>

                          {/*<Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: "#94a3b8",
                              mt: 0.5,
                            }}
                          >
                            {task.unitCode || UNIT_CODE}
                            {" · "}
                            {task.taskCode || "Chưa có mã"}
                          </Typography>*/}

                          <Typography
                            sx={{
                              fontSize: "0.75rem",
                              color: "#2563eb",
                              mt: 0.5,
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <EditOutlined sx={{ fontSize: 14 }} />
                            Nhấn để xem / chỉnh sửa
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          color: "#475569",
                          whiteSpace: "pre-line",
                          overflowWrap: "anywhere",
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {task.output || "Chưa cập nhật"}
                      </Typography>
                    </TableCell>

                    <TableCell sx={bodyCellSx}>
                      <Typography sx={{ fontSize: "0.8rem", color: "#475569" }}>
                        {task.deadline || "Chưa xác định"}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" sx={bodyCellSx}>
                      <Chip
                        label={task.type || "Thường xuyên"}
                        size="small"
                        sx={{
                          maxWidth: "100%",
                          height: "auto",
                          bgcolor:
                            task.type === "Đột xuất" ? "#fef3c7" : "#dbeafe",
                          color:
                            task.type === "Đột xuất" ? "#92400e" : "#1d4ed8",
                          "& .MuiChip-label": {
                            whiteSpace: "normal",
                            py: 0.75,
                            px: 1,
                            fontSize: "0.72rem",
                            fontWeight: 700,
                          },
                        }}
                      />
                    </TableCell>

                    <TableCell align="center" sx={bodyCellSx}>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>
                        {Number(task.baseScore ?? 0).toLocaleString("vi-VN", {
                          maximumFractionDigits: 2,
                        })}
                      </Typography>
                    </TableCell>

                    <TableCell align="center" sx={bodyCellSx}>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700 }}>
                        {(Number(task.difficultyFactor ?? 1) * 100).toLocaleString(
                          "vi-VN",
                          { maximumFractionDigits: 2 }
                        )}
                        %
                      </Typography>
                    </TableCell>

                    <TableCell align="center" sx={bodyCellSx}>
                      <Typography
                        sx={{
                          fontSize: "0.95rem",
                          fontWeight: 800,
                          color: "#1d4ed8",
                        }}
                      >
                        {getConvertedScore(task).toLocaleString("vi-VN", {
                          maximumFractionDigits: 2,
                        })}
                      </Typography>
                      <Typography sx={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                        điểm
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}

                {tasks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                      <AssignmentOutlined
                        sx={{ fontSize: 42, color: "#cbd5e1", mb: 1 }}
                      />
                      <Typography sx={{ color: "#64748b", fontWeight: 600 }}>
                        Chưa có nhiệm vụ nào
                      </Typography>
                      <Typography
                        sx={{ color: "#94a3b8", fontSize: "0.8rem", mt: 0.5 }}
                      >
                        Nhấn “Thêm nhiệm vụ mới” để bắt đầu
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {/* NÚT THÊM NHIỆM VỤ MỚI ĐẶT CĂN LỀ TRÁI (TẠI VỊ TRÍ MŨI TÊN ĐỎ) */}
                <TableRow>
                  <TableCell colSpan={8} sx={{ p: 1.5, bgcolor: "#fff" }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "flex-start",
                        alignItems: "center",
                        pl: 1,
                      }}
                    >
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setIsAddDialogOpen(true)}
                        sx={{
                          bgcolor: "#2563eb",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: "0.78rem",
                          borderRadius: 1.5,
                          textTransform: "none",
                          boxShadow: "none",
                          px: 2,
                          py: 0.75,
                          "&:hover": {
                            bgcolor: "#1d4ed8",
                          },
                        }}
                      >
                        Thêm nhiệm vụ mới
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>

                {/* DÒNG TỔNG ĐIỂM NHÓM B (CUỐI BẢNG) */}
                <TableRow sx={{ bgcolor: "#f1f5f9" }}>
                  <TableCell
                    colSpan={7}
                    sx={{
                      ...bodyCellSx,
                      fontWeight: 800,
                      py: 2,
                    }}
                  >
                    TỔNG ĐIỂM NHÓM B
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      ...bodyCellSx,
                      fontWeight: 800,
                      color: "#1d4ed8",
                    }}
                  >
                    {finalGroupBScore.toFixed(1)} / 70 điểm
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* DIALOG THÊM NHIỆM VỤ MỚI */}
          {/* DIALOG THÊM NHIỆM VỤ MỚI */}
          <TaskAddDialog
            open={isAddDialogOpen}
            tasks={tasks}
            onClose={() => setIsAddDialogOpen(false)}
            onAddTask={handleAddTaskSubmit} // <--- Sửa ở đây để nhận và cập nhật dữ liệu lên trang
            UNIT_CODE={UNIT_CODE}
            TYPES={TYPES}
            AXES={AXES}
            STATUSES={STATUSES}
            inputSx={inputSx}
          />

          {/* DIALOG XEM / SỬA NHIỆM VỤ */}
          <TaskCatalogDialog
            open={Boolean(selectedTask)}
            selectedTask={selectedTask}
            tasks={tasks}
            onClose={handleCloseDrawer}
            onSaveTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            UNIT_CODE={UNIT_CODE}
            TYPES={TYPES}
            AXES={AXES}
            STATUSES={STATUSES}
            inputSx={inputSx}
          />
        </Box>
      </Paper>
      
      {/* Snackbar thông báo */}
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