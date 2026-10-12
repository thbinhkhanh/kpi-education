import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Collapse,
  MenuItem,
} from '@mui/material';
import EditOutlined from '@mui/icons-material/EditOutlined';
import ExpandLess from '@mui/icons-material/ExpandLess';

const initialInfo = [
  { label: 'Họ và tên', value: 'Phạm Văn Thái' },
  { label: 'Ngày sinh', value: '21/06/1969' },
  { label: 'Chức vụ Đảng', value: 'Đảng viên' },
  { label: 'Chức vụ chính quyền', value: 'Tổ trưởng chuyên môn' },
  { label: 'Chức vụ đoàn thể', value: 'Không' },
  { label: 'Đơn vị công tác', value: 'Trường Tiểu học Bình Khánh' },
];

const inputSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: '#fff',
    fontSize: '0.85rem',
    borderRadius: 1.5,
  },
  '& .MuiOutlinedInput-input': {
    py: 0.7,
    px: 1,
  },
};

const formatDateText = (date) => {
  if (!date || !/^\d{2}\/\d{2}\/\d{4}$/.test(date)) return '';

  const [day, month, year] = date.split('/');
  return `Bình Khánh, ngày ${day} tháng ${month} năm ${year}`;
};

// Tạo danh sách các năm (ví dụ từ 2024 đến 2030)
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export default function Header({ 
  onChange, 
  quarter: propQuarter, 
  year: propYear, 
  teacherName: propTeacherName,
  onQuarterChange, 
  onYearChange,
  onTeacherNameChange 
}) {
  const [personalInfo, setPersonalInfo] = useState(initialInfo);
  const [date, setDate] = useState('20/08/2026');
  
  // Dùng giá trị truyền từ App xuống, nếu chưa có thì dùng giá trị mặc định bên trong
  const quarter = propQuarter !== undefined && propQuarter !== null ? propQuarter : '3';
  const year = propYear !== undefined && propYear !== null ? propYear : '2026';

  const [expanded, setExpanded] = useState(false);
  const [unitName, setUnitName] = useState('TRƯỜNG TIỂU HỌC BÌNH KHÁNH');

  // Đồng bộ Tên giáo viên nếu từ App truyền xuống thay đổi
  useEffect(() => {
    if (propTeacherName) {
      setPersonalInfo((prev) =>
        prev.map((item) =>
          item.label === 'Họ và tên' ? { ...item, value: propTeacherName } : item
        )
      );
    }
  }, [propTeacherName]);

  useEffect(() => {
    onChange?.({
      personalInfo,
      date,
      quarter,
      year,
    });
  }, [personalInfo, date, quarter, year, onChange]);

  const updateInfo = (index, value) => {
    const updated = personalInfo.map((item, i) =>
      i === index ? { ...item, value } : item
    );
    setPersonalInfo(updated);

    // Nếu sửa ô "Họ và tên", gọi callback đẩy lên App
    if (personalInfo[index].label === 'Họ và tên') {
      onTeacherNameChange?.(value);
    }
  };

  const name = personalInfo.find((item) => item.label === 'Họ và tên')?.value || '';
  const position =
    personalInfo.find((item) => item.label === 'Chức vụ chính quyền')?.value || '';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, mb: 3 }}>
      {/* HEADER THU GỌN - ẨN KHI ĐANG CHỈNH SỬA */}
    {!expanded && (
      <Paper
        variant="outlined"
        sx={{
          p: { xs: 1.25, sm: 1.5 },
          borderColor: '#dbeafe',
          borderRadius: 2,
          bgcolor: '#f8fafc',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 1,
          }}
        >
          <Box
            sx={{
              minWidth: 0,
              flex: 1,
              textAlign: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: '1rem',
                fontWeight: 700,
                color: '#64748b',
                textAlign: 'left',
              }}
            >
              {unitName}
            </Typography>

            <Typography
              sx={{
                mt: 0.3,
                fontSize: { xs: '1rem', sm: '1.5rem' },
                fontWeight: 800,
                color: '#1e3a8a',
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              BẢN TỰ ĐÁNH GIÁ, XẾP LOẠI CỦA CÁ NHÂN
            </Typography>

            <Typography
              sx={{
                mt: 0.4,
                fontSize: '1rem',
                color: '#475569',
              }}
            >
              {name}
              {position ? ` · ${position}` : ''}
              {' · Quý '}{quarter}
              {' · Năm '}{year}
              {date ? ` · Ngày lập ${date}` : ''}
            </Typography>
          </Box>

          <Button
            variant="outlined"
            size="small"
            startIcon={expanded ? <ExpandLess /> : <EditOutlined />}
            onClick={() => setExpanded((prev) => !prev)}
            sx={{
              flexShrink: 0,
              alignSelf: { xs: 'flex-start', md: 'center' },
              textTransform: 'none',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {expanded ? 'Thu gọn' : 'Chỉnh sửa'}
          </Button>
        </Box>
      </Paper>
    )}

      {/* PHẦN CHỈNH SỬA */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>        
          {/* CƠ QUAN VÀ QUỐC HIỆU */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              alignItems: 'start',
              gap: 1.5,
              pb: 1.5,
              borderBottom: '1px solid #cbd5e1',
            }}
          >
            <Box sx={{ textAlign: { xs: 'center', md: 'left' }, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: '0.8rem',
                  fontWeight: 800,
                  color: '#1e3a8a',
                }}
              >
                CƠ QUAN, ĐƠN VỊ
              </Typography>

              <TextField
                fullWidth
                size="small"
                value={unitName}
                onChange={(e) => setUnitName(e.target.value)}
                inputProps={{ 'aria-label': 'Tên cơ quan, đơn vị' }}
                sx={{
                  mt: 0.5,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#fff',
                    fontSize: { xs: '0.9rem', sm: '1rem' },
                    fontWeight: 800,
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover fieldset': { borderColor: '#cbd5e1' },
                    '&.Mui-focused fieldset': { borderColor: '#2563eb' },
                  },
                  '& input': {
                    textAlign: { xs: 'center', md: 'left' },
                    px: 1,
                    py: 0.5,
                  },
                }}
              />
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                minWidth: 0,
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
                <Typography
                  sx={{
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 800,
                    color: '#0f172a',
                  }}
                >
                  ĐẢNG CỘNG SẢN VIỆT NAM
                </Typography>

                <Box
                  sx={{
                    width: 80,
                    height: 2,
                    mx: 'auto',
                    my: 0.5,
                    bgcolor: '#64748b',
                    borderRadius: 10,
                  }}
                />

                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: '#334155',
                    lineHeight: 1.5,
                  }}
                >
                  {formatDateText(date)}
                </Typography>
              </Box>

              <Button
                variant="outlined"
                size="small"
                startIcon={<ExpandLess />}
                onClick={() => setExpanded(false)}
                sx={{
                  flexShrink: 0,
                  textTransform: 'none',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                Thu gọn
              </Button>
            </Box>
          </Box>

          {/* TIÊU ĐỀ VÀ QUÝ, NĂM, NGÀY LẬP */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              width: '100%',
            }}
          >
            <Typography
              sx={{
                width: '100%',
                fontSize: { xs: '1.1rem', sm: '1.35rem', md: '1.45rem' },
                fontWeight: 800,
                lineHeight: 1.4,
                color: '#1e3a8a',
                textAlign: 'center',
              }}
            >
              BẢN TỰ ĐÁNH GIÁ, XẾP LOẠI CỦA CÁ NHÂN
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.75,
                flexWrap: 'wrap',
                width: '100%',
                position: 'relative',
              }}
            >
              {/* Chọn Quý */}
              <TextField
                select
                value={quarter}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onQuarterChange) {
                    onQuarterChange(val);
                  }
                }}
                size="small"
                inputProps={{ 'aria-label': 'Quý đánh giá' }}
                sx={{
                  width: 105,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  },
                  '& .MuiSelect-select': { py: 0.7, px: 1 },
                }}
              >
                <MenuItem value="1" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>QUÝ 1</MenuItem>
                <MenuItem value="2" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>QUÝ 2</MenuItem>
                <MenuItem value="3" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>QUÝ 3</MenuItem>
                <MenuItem value="4" sx={{ fontSize: '0.85rem', fontWeight: 600 }}>QUÝ 4</MenuItem>
              </TextField>

              <Typography
                sx={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d4ed8' }}
              >
                Năm
              </Typography>

              {/* Chọn Năm (Dạng Dropdown Select thay vì nhập tay) */}
              <TextField
                select
                value={year}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onYearChange) {
                    onYearChange(val);
                  }
                }}
                size="small"
                inputProps={{ 'aria-label': 'Năm đánh giá' }}
                sx={{
                  width: 95,
                  '& .MuiOutlinedInput-root': {
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                  },
                  '& .MuiSelect-select': { py: 0.7, px: 1 },
                }}
              >
                {YEARS.map((y) => (
                  <MenuItem key={y} value={String(y)} sx={{ fontSize: '0.85rem', fontWeight: 600 }}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>

              {/* Ngày lập */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 0.75,
                  position: { xs: 'static', md: 'absolute' },
                  right: 0,
                }}
              >
                <Typography
                  sx={{
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    color: '#334155',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Ngày lập
                </Typography>

                <TextField
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  size="small"
                  placeholder="dd/mm/yyyy"
                  inputProps={{
                    'aria-label': 'Ngày tháng năm lập bản đánh giá',
                    style: { textAlign: 'center' },
                  }}
                  sx={{
                    width: 110,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#fff',
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                    },
                    '& input': { py: 0.7, px: 0.5 },
                  }}
                />
              </Box>
            </Box>
          </Box>

          {/* THÔNG TIN CÁ NHÂN */}
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              bgcolor: '#f8fafc',
              borderColor: '#e2e8f0',
              borderRadius: 2,
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  lg: 'repeat(6, minmax(0, 1fr))',
                },
                gap: 1,
              }}
            >
              {personalInfo.map((item, index) => (
                <Box key={item.label} sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      color: '#64748b',
                      mb: 0.4,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {item.label}
                  </Typography>

                  <TextField
                    fullWidth
                    size="small"
                    value={item.value}
                    onChange={(e) => updateInfo(index, e.target.value)}
                    inputProps={{ 'aria-label': item.label }}
                    sx={inputSx}
                  />
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Collapse>
    </Box>
  );
}