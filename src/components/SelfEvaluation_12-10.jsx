import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
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
  Checkbox,
  TextField,
  Snackbar,
  Alert,
} from '@mui/material';
import Check from '@mui/icons-material/Check';
import Header from './Header';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import { saveSelfEvaluation } from '../utils/saveSelfEvaluation';
import { getSelfEvaluation } from '../utils/saveSelfEvaluation';
import { useTaskCatalog } from '../contexts/TaskCatalogContext';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

// Hàm làm tròn thông minh: tối đa 1 số lẻ, nếu phần thập phân là 0 thì bỏ
const formatScore = (value) => {
  const num = Number(value) || 0;
  const rounded = Math.round((num + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
};

// 1. Thêm forwardRef để nhận ref từ App.js
export default forwardRef(function SelfEvaluation({
  onNavigateCatalog,
  groupBScore = 0,
  taskStats: propTaskStats = {},
  quarter,       // <--- Thêm dòng này
  year,          // <--- Thêm dòng này
  teacherName,   // <--- Thêm dòng này
  onQuarterChange, // <--- Thêm dòng này
  onYearChange,    // <--- Thêm dòng này
  onTeacherNameChange, // <--- Thêm dòng này
}, ref) {
  const { selfEvaluationCache, setSelfEvaluationCache } = useTaskCatalog();
  const [criteriaA, setCriteriaA] = useState({});
  const [achievedScores, setAchievedScores] = useState({});
  const [comment, setComment] = useState('');

  const [criteriaGroups, setCriteriaGroups] = useState([]);
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [fallbackGroupBScore, setFallbackGroupBScore] = useState(null);
  
  // State lưu trữ thống kê nhiệm vụ được nạp từ Firestore hoặc dùng từ props
  const [savedTaskStats, setSavedTaskStats] = useState(null);

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

  const handleCheckboxChange = (key) => {
    setCriteriaA((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleScoreChange = (id, value, max) => {
    if (value !== '' && (!Number.isFinite(Number(value)) ||
      Number(value) < 0 || Number(value) > max)) {
      return;
    }

    setAchievedScores((prev) => ({
      ...prev,
      [id]: value === '' ? '' : Number(value),
    }));
  };

  const groupAScore = Number(
    Object.values(achievedScores)
      .reduce((sum, score) => sum + (Number(score) || 0), 0)
      .toFixed(2)
  );

  // Xác định điểm nhóm B: nếu prop groupBScore = 0 thì dùng điểm dự phòng từ Firestore
  const effectiveGroupBScore = Number(groupBScore) === 0 && fallbackGroupBScore !== null 
    ? fallbackGroupBScore 
    : groupBScore;

  const normalizedGroupBScore = Math.min(
    70,
    Math.max(0, Number(effectiveGroupBScore) || 0)
  );

  const totalScore = Number(
    (groupAScore + normalizedGroupBScore).toFixed(2)
  );

  // Sử dụng taskStats lấy từ dữ liệu đã lưu hoặc từ props truyền vào
  const activeTaskStats = (savedTaskStats && Object.keys(savedTaskStats).length > 0) 
    ? savedTaskStats 
    : propTaskStats;

  const totalTasks = Number(activeTaskStats.totalTasks) || 0;
  const completedTasks = Number(activeTaskStats.completedTasks) || 0;
  const exceededTasks = Number(activeTaskStats.exceededTasks) || 0;

  const meetsExcellentCriteria =
    totalTasks > 0 &&
    completedTasks === totalTasks &&
    exceededTasks >= Math.ceil(totalTasks * 0.3);

  const classification =
    totalScore >= 90 && meetsExcellentCriteria
      ? 'Hoàn thành xuất sắc nhiệm vụ'
      : totalScore >= 70
        ? 'Hoàn thành tốt nhiệm vụ'
        : totalScore >= 50
          ? 'Hoàn thành nhiệm vụ'
          : 'Không hoàn thành nhiệm vụ';

  const [headerData, setHeaderData] = useState(null);

  const handleHeaderChange = React.useCallback((data) => {
    setHeaderData(data);
  }, []);

  // Hiệu ứng tải điểm từ KPI_TASK_EVALUATION nếu groupBScore bằng 0
  useEffect(() => {
    const year = headerData?.year;
    const quarter = headerData?.quarter;
    const teacherId = headerData?.personalInfo
      ?.find((item) => item.label?.trim() === 'Họ và tên')
      ?.value?.trim();

    if (!year || !quarter || !teacherId) return;

    let cancelled = false;

    const fetchTaskEvaluationScore = async () => {
      try {
        const cacheKey = `${String(year)}_Q${String(quarter)}_${teacherId}`;
        const snapshot = await getDoc(doc(db, "KPI_TASK_EVALUATION", cacheKey));

        if (cancelled) return;

        if (snapshot.exists()) {
          const evalData = snapshot.data();
          const score = evalData.totalScore ?? evalData.groupBScore ?? 0;
          setFallbackGroupBScore(Number(score));
        }
      } catch (error) {
        console.error("Lỗi lấy dữ liệu từ KPI_TASK_EVALUATION:", error);
      }
    };

    if (Number(groupBScore) === 0) {
      fetchTaskEvaluationScore();
    }

    return () => {
      cancelled = true;
    };
  }, [headerData?.year, headerData?.quarter, headerData?.personalInfo, groupBScore]);

  // 2. Đưa logic lưu ra thành một hàm riêng để có thể gọi từ ref hoặc nút bấm
  const handleSaveEvaluation = async () => {
    try {
      const teacherId = headerData?.personalInfo
        ?.find((item) => item.label?.trim() === 'Họ và tên')
        ?.value?.trim();

      if (!headerData?.year || !headerData?.quarter || !teacherId) {
        setSnackbar({
          open: true,
          message: 'Vui lòng nhập đầy đủ năm, quý và họ tên trước khi lưu!',
          severity: 'warning',
        });
        return;
      }

      const savedData = {
        criteriaGroups,
        selfEvaluation: {
          criteriaA,
          achievedScores,
          comment,
        },
        groupAScore,
        groupBScore: normalizedGroupBScore,
        totalScore,
        classification,
        taskStats: activeTaskStats, // Đảm bảo lưu đúng taskStats thực tế
      };

      await saveSelfEvaluation({
        year: headerData.year,
        quarter: headerData.quarter,
        teacherId,
        ...savedData,
      });

      const cacheKey = `${headerData.year}_Q${headerData.quarter}_${teacherId}`;

      setSelfEvaluationCache((prev) => ({
        ...prev,
        [cacheKey]: savedData,
      }));

      setSnackbar({
        open: true,
        message: 'Lưu thành công!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Lỗi lưu bản tự đánh giá:', error);
      setSnackbar({
        open: true,
        message: `Lưu thất bại: ${error.message}`,
        severity: 'error',
      });
    }
  };

  // 3. Cho phép component cha (App.js) gọi hàm handleSaveEvaluation thông qua ref
  useImperativeHandle(ref, () => ({
    save: handleSaveEvaluation
  }));

  const headerCellSx = {
    fontWeight: 700,
    color: '#334155',
    bgcolor: '#f1f5f9',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    py: 1.5,
  };

  const bodyCellSx = {
    borderColor: '#e8edf4',
    py: 1.1,
  };

  const sectionBarSx = {
    p: { xs: 1.5, sm: 2 },
    display: 'flex',
    flexDirection: { xs: 'column', sm: 'row' },
    alignItems: { xs: 'flex-start', sm: 'center' },
    justifyContent: 'space-between',
    gap: 1,
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 700,
  };

  const renderCriteriaRow = (item) => {
    const max = item.max ?? 2;

    return (
      <TableRow
        key={item.id}
        hover
        sx={{
          '&:hover': { bgcolor: '#f8fbff' },
          '&:last-child td': { borderBottom: 0 },
        }}
      >
        <TableCell
          align="center"
          sx={{
            ...bodyCellSx,
            color: '#64748b',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
          }}
        >
          {item.id}
        </TableCell>

        <TableCell
          sx={{
            ...bodyCellSx,
            minWidth: 280,
            fontSize: '0.875rem',
            color: '#334155',
          }}
        >
          <Box
            sx={{
              lineHeight: 1.7,
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: 2,
              overflow: 'hidden',
              overflowWrap: 'anywhere',
              maxHeight: '3.4em',
            }}
          >
            {item.text}
          </Box>
        </TableCell>

        <TableCell align="center" sx={bodyCellSx}>
          <Checkbox
            size="small"
            checked={Boolean(criteriaA[item.id])}
            onChange={() => handleCheckboxChange(item.id)}
            sx={{
              color: '#94a3b8',
              '&.Mui-checked': { color: '#2563eb' },
            }}
          />
        </TableCell>

        <TableCell align="center" sx={bodyCellSx}>
          <Checkbox
            size="small"
            color="error"
            checked={!criteriaA[item.id]}
            onChange={() => handleCheckboxChange(item.id)}
          />
        </TableCell>

        <TableCell align="center" sx={bodyCellSx}>
          {max}
        </TableCell>

        <TableCell align="center" sx={{ ...bodyCellSx, minWidth: 90 }}>
          <TextField
            type="number"
            size="small"
            value={achievedScores[item.id] ?? 0}
            onChange={(e) =>
              handleScoreChange(item.id, e.target.value, max)
            }
            inputProps={{
              min: 0,
              max,
              step: 0.5,
            }}
            sx={{
              width: 75,
              '& input': {
                textAlign: 'center',
                fontWeight: 700,
                color: '#15803d',
                py: 0.8,
              },
            }}
          />
        </TableCell>
      </TableRow>
    );
  };

  useEffect(() => {
    let cancelled = false;

    const year = headerData?.year;
    const quarter = headerData?.quarter;

    const teacherId = headerData?.personalInfo
      ?.find((item) => item.label?.trim() === 'Họ và tên')
      ?.value?.trim();

    if (!year || !quarter || !teacherId) return;

    const cacheKey = `${year}_Q${quarter}_${teacherId}`;

    const applyData = (data) => {
      setCriteriaGroups(data.criteriaGroups ?? []);
      setCriteriaA(data.selfEvaluation?.criteriaA ?? {});
      setAchievedScores(data.selfEvaluation?.achievedScores ?? {});
      setComment(data.selfEvaluation?.comment ?? '');
      // Khôi phục taskStats từ dữ liệu đã lưu nếu có
      if (data.taskStats) {
        setSavedTaskStats(data.taskStats);
      }
    };

    const loadData = async () => {
      try {
        const cachedData = selfEvaluationCache[cacheKey];

        if (cachedData) {
          applyData(cachedData);
          return;
        }

        const data = await getSelfEvaluation({
          year,
          quarter,
          teacherId,
        });

        if (cancelled) return;

        if (data) {
          setSelfEvaluationCache((prev) => ({
            ...prev,
            [cacheKey]: data,
          }));

          applyData(data);
        } else {
          setCriteriaGroups([]);
          setCriteriaA({});
          setAchievedScores({});
          setComment('');
          setSavedTaskStats(null);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Lỗi tải bản tự đánh giá:', error);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [
    headerData?.year,
    headerData?.quarter,
    headerData?.personalInfo,
    selfEvaluationCache,
    setSelfEvaluationCache,
  ]);

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1600,
        mx: 'auto',
        p: { xs: 0, sm: 1, md: 2 },
        textAlign: 'left',
        color: '#334155',
        '& .MuiTypography-root': {
          overflowWrap: 'anywhere',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          border: '1px solid #e2e8f0',
          borderRadius: { xs: 2, sm: 3 },
          boxShadow: '0 8px 30px rgba(15, 23, 42, 0.045)',
          bgcolor: '#fff',
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

        {/* PHẦN I */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '1.1rem',
              fontWeight: 800,
              color: '#1e3a8a',
              mb: 1,
            }}
          >
            I. TỰ ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN NHIỆM VỤ
          </Typography>

          <Typography
            sx={{
              fontSize: '0.875rem',
              color: '#64748b',
              fontStyle: 'italic',
              lineHeight: 1.8,
            }}
          >
            Trên cơ sở nhiệm vụ được giao, cá nhân tự đánh giá về kết quả
            thực hiện nhiệm vụ theo quý như sau:
          </Typography>
        </Box>

        {/* NHÓM A */}
        <Box sx={{ mb: 4 }}>
          <Box
            sx={{
              ...sectionBarSx,
              bgcolor: '#172554',
              borderRadius: '10px 10px 0 0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 30,
                  height: 30,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  borderRadius: 1,
                  fontSize: '1rem',
                }}
              >
                A
              </Box>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 800 }}>
                NHÓM TIÊU CHÍ CHUNG (30 ĐIỂM)
              </Typography>
            </Box>

            <Box
              sx={{
                px: 1.5,
                py: 0.6,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.12)',
                whiteSpace: 'nowrap',
              }}
            >
              Điểm đạt: {formatScore(groupAScore)} / 30
            </Box>
          </Box>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderColor: '#e2e8f0',
              borderRadius: '0 0 10px 10px',
              overflowX: 'auto',
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: 850,
                tableLayout: 'auto',
                '& th, & td': {
                  borderColor: '#e8edf4',
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell
                    align="center"
                    sx={{ ...headerCellSx, width: 55 }}
                  >
                    TT
                  </TableCell>
                  <TableCell sx={headerCellSx}>
                    TIÊU CHÍ / NỘI DUNG
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...headerCellSx, width: 95 }}
                  >
                    Đảm bảo (X)
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...headerCellSx, width: 110 }}
                  >
                    Không đảm bảo
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...headerCellSx, width: 90 }}
                  >
                    Điểm tối đa
                  </TableCell>
                  <TableCell
                    align="center"
                    sx={{ ...headerCellSx, width: 85 }}
                  >
                    Điểm đạt
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {criteriaGroups.map((group) => (
                  <React.Fragment key={group.title}>
                    <TableRow>
                      <TableCell
                        align="center"
                        sx={{
                          ...bodyCellSx,
                          fontWeight: 800,
                          bgcolor: '#eff6ff',
                          color: '#1d4ed8',
                        }}
                      >
                        {group.title}
                      </TableCell>

                      <TableCell
                        colSpan={3}
                        sx={{
                          ...bodyCellSx,
                          fontWeight: 700,
                          bgcolor: '#eff6ff',
                          color: '#1e3a8a',
                          lineHeight: 1.7,
                        }}
                      >
                        {group.heading}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          ...bodyCellSx,
                          fontWeight: 800,
                          bgcolor: '#eff6ff',
                        }}
                      >
                        {group.max}
                      </TableCell>

                      <TableCell
                        align="center"
                        sx={{
                          ...bodyCellSx,
                          fontWeight: 800,
                          color: '#15803d',
                          bgcolor: '#eff6ff',
                        }}
                      >
                        {formatScore(
                          group.items.reduce(
                            (sum, item) =>
                              sum + (Number(achievedScores[item.id]) || 0),
                            0
                          )
                        )}
                      </TableCell>
                    </TableRow>

                    {group.items.map(renderCriteriaRow)}
                  </React.Fragment>
                ))}

                <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                  <TableCell
                    colSpan={4}
                    sx={{
                      ...bodyCellSx,
                      fontWeight: 800,
                      color: '#1e293b',
                      py: 1.5,
                    }}
                  >
                    TỔNG CỘNG NHÓM (A)
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{ ...bodyCellSx, fontWeight: 800 }}
                  >
                    30
                  </TableCell>

                  <TableCell
                    align="center"
                    sx={{
                      ...bodyCellSx,
                      fontWeight: 800,
                      color: '#1d4ed8',
                    }}
                  >
                    {formatScore(groupAScore)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* --- NHÓM B & TỔNG ĐIỂM TÍCH HỢP GỌN GÀNG --- */}
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{
              ...sectionBarSx,
              bgcolor: '#1e40af',
              borderRadius: '10px 10px 0 0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: 'rgba(255,255,255,0.15)',
                  borderRadius: 1,
                  fontSize: '0.9rem',
                }}
              >
                B
              </Box>

              <Typography sx={{ fontSize: 'inherit', fontWeight: 800 }}>
                KẾT QUẢ THỰC HIỆN NHIỆM VỤ ĐƯỢC GIAO (70 ĐIỂM) & TỔNG KẾT ĐIỂM
              </Typography>
            </Box>
          </Box>

          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: '0 0 10px 10px',
              borderColor: '#e2e8f0',
              overflow: 'hidden',
            }}
          >
            <Table
              size="small"
              sx={{
                '& td, & th': {
                  borderColor: '#e8edf4',
                  py: 1.2,
                  px: { xs: 1.5, sm: 2 },
                },
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ width: '65%', fontWeight: 700, color: '#64748b', fontSize: '0.8rem' }}>NỘI DUNG</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem', width: 90 }}>Điểm tối đa</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, color: '#64748b', fontSize: '0.8rem', width: 100 }}>Điểm đạt được</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ '&:hover': { bgcolor: '#f8fbff' } }}>
                  <TableCell sx={{ fontWeight: 700, color: '#1e3a8a' }}>
                    TỔNG (B) = Điểm KPI đã tính tại bảng tính điểm
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 700, fontSize: '1.2rem' }}>70</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 800, fontSize: '1.2rem', color: '#1d4ed8' }}>
                    {formatScore(normalizedGroupBScore)}
                  </TableCell>
                </TableRow>

                <TableRow sx={{ bgcolor: '#dcfce7' }}>
                  <TableCell sx={{ fontWeight: 900, color: '#166534' }}>
                    TỔNG CỘNG (A + B)
                  </TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#166534' }}>100</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 900, fontSize: '1.2rem', color: '#dc2626' }}>
                    {formatScore(totalScore)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* --- XẾP LOẠI (THIẾT KẾ GỌN NGANG, ĐẦY ĐỦ SỐ LIỆU) --- */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              mb: 1.5,
            }}
          >
            II. Tự đề xuất xếp loại mức chất lượng
          </Typography>

          <Paper
            variant="outlined"
            sx={{
              p: { xs: 1.5, sm: 2 },
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2,
              bgcolor: '#ecfdf5',
              borderColor: '#a7f3d0',
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: '#d1fae5',
                  borderRadius: '50%',
                }}
              >
                <Check sx={{ fontSize: 20, color: '#059669' }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.7rem', fontWeight: 800, color: '#047857', letterSpacing: '0.05em' }}>
                  MỨC XẾP LOẠI ĐỀ XUẤT
                </Typography>
                <Typography sx={{ fontSize: '0.95rem', fontWeight: 800, color: '#dc2626' }}>
                  {classification}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 1.5, sm: 3 },
                fontSize: '0.8rem',
                color: '#334155',
                borderLeft: { sm: '1px solid #cbd5e1' },
                pl: { sm: 3 },
                alignItems: 'center',
              }}
            >
              <Box>
                Tổng điểm: <strong style={{ color: '#0f172a' }}>{formatScore(totalScore)}/100</strong>
              </Box>
              <Box>
                Hoàn thành: <strong style={{ color: '#0f172a' }}>{completedTasks}/{totalTasks}</strong>
              </Box>
              <Box>
                Vượt mức: <strong style={{ color: '#0f172a' }}>{exceededTasks}/{totalTasks}</strong>
              </Box>
            </Box>
          </Paper>
        </Box>

        {/* NHẬN XÉT */}
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontSize: '0.95rem',
              fontWeight: 800,
              color: '#0f172a',
              mb: 1.5,
            }}
          >
            III. Nhận xét, đánh giá của cấp có thẩm quyền
          </Typography>

          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Nhận xét"
            placeholder="Nhập nhận xét, đánh giá..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </Box>

        {/* CHỮ KÝ */}
        <Box
          sx={{
            pt: 2,
            borderTop: '1px dashed #cbd5e1',
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              gap: { xs: 3, sm: 2 },
              textAlign: 'center',
            }}
          >
            <Box sx={{ px: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#334155',
                }}
              >
                Ý KIẾN CỦA TỔ CHUYÊN MÔN
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                }}
              >
                (Ký, ghi rõ họ tên)
              </Typography>
              <Box sx={{ height: 70 }} />
            </Box>

            <Box sx={{ px: 1 }}>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                  mb: 0.5,
                }}
              >
                Bình Khánh, ngày ... tháng ... năm 2026
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  color: '#334155',
                }}
              >
                XÁC NHẬN CỦA LÃNH ĐẠO ĐƠN VỊ
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.75rem',
                  color: '#64748b',
                  fontStyle: 'italic',
                }}
              >
                (Ký, ghi rõ họ tên và đóng dấu)
              </Typography>
              <Box sx={{ height: 50 }} />
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Snackbar thông báo trạng thái */}
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