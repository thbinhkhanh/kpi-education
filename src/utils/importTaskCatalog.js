import * as XLSX from "xlsx";

const UNIT_CODE = "H29.233.11";
const FALLBACK_PERIOD = "(Daotao 15/08)_KPI-Q3-2026";

const AXES = [
  "Trục 1 - Thực hiện mục tiêu phát triển kinh tế - xã hội và nhiệm vụ chính trị được giao",
  "Trục 2 - Hoàn thiện thể chế, đẩy mạnh phân cấp, phân quyền gắn với kiểm tra, giám sát",
  "Trục 3 - Thúc đẩy phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số",
  "Trục 4 - Xây dựng Đảng và hệ thống chính trị trong sạch, vững mạnh; giữ gìn đoàn kết, thống nhất nội bộ; phòng, chống tham nhũng, lãng phí, tiêu cực",
  "Trục 5 - Phát triển văn hóa, con người, bảo đảm an sinh xã hội, nâng cao đời sống nhân dân",
  "Trục 6 - Củng cố quốc phòng, an ninh, giữ vững ổn định chính trị - xã hội, nâng cao hiệu quả đối ngoại và hội nhập quốc tế",
];

const toNumber = (value, fallback = 0) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return fallback;

  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
};

export async function importTaskCatalog(file) {
  if (!file) throw new Error("Vui lòng chọn file Excel.");

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("File Excel không có trang tính.");
  }

  const worksheet = workbook.Sheets[sheetName];
  
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (!rows.length) {
    throw new Error("File Excel không có dữ liệu.");
  }

  // Lấy dữ liệu bắt đầu từ dòng thứ 4 (index 3), bỏ qua 3 dòng tiêu đề
  const taskRows = rows.slice(3).filter((row) => 
    row.some((cell) => String(cell).trim() !== "")
  );

  if (!taskRows.length) {
    throw new Error("Không tìm thấy dữ liệu nhiệm vụ từ dòng 4 trong file Excel.");
  }

  return parseRowsToTasks(taskRows);
}

function parseRowsToTasks(taskRows) {
  return taskRows.map((row, index) => {
    // Ánh xạ vị trí cột từ dòng 4 trở đi:
    // row[0]: STT
    // row[1]: Mã đơn vị
    // row[2]: Tên công việc
    // row[3]: Kết quả đầu ra
    // row[4]: Thời hạn hoàn thành
    // row[5]: Loại công việc
    // row[6]: Điểm chuẩn
    // row[7]: Hệ số độ khó
    // row[9]: Minh chứng
    // row[10]: Ghi chú
    // row[12]: Trạng thái
    // row[13]: Kỳ đánh giá

    const rawDifficulty = row[7];
    let difficultyFactor = 1;

    if (rawDifficulty !== undefined && rawDifficulty !== "") {
      const numVal = Number(rawDifficulty);
      if (Number.isFinite(numVal)) {
        difficultyFactor = numVal > 5 ? numVal / 100 : numVal;
      } else {
        const cleanDifficulty = String(rawDifficulty).replace("%", "").trim();
        const parsed = toNumber(cleanDifficulty, 1);
        difficultyFactor = parsed > 5 ? parsed / 100 : parsed;
      }
    }

    const baseScore = toNumber(row[6], 10);
    const typeVal = String(row[5] ?? "").trim();

    return {
      id: index + 1,
      unitCode: String(row[1] ?? "").trim() || UNIT_CODE,
      taskName: String(row[2] ?? "").trim(),
      output: String(row[3] ?? "").trim(),
      deadline: String(row[4] ?? "").trim(),
      type: typeVal || "Thường xuyên",
      baseScore: baseScore,
      difficultyFactor: difficultyFactor > 0 ? difficultyFactor : 1,
      evidence: String(row[9] ?? "").trim(),
      note: String(row[10] ?? "").trim(),
      axis: AXES[0],
      status: String(row[12] ?? "").trim() || "Hoạt động",
      period: String(row[13] ?? "").trim() || FALLBACK_PERIOD, // Lấy động từ cột Kỳ đánh giá
    };
  });
}