import * as XLSX from "xlsx";

const UNIT_CODE = "A29.192";
const DEFAULT_PERIOD = "(Daotao 15/08)_KPI-Q3-2026";

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
  
  // Đọc file dưới dạng mảng các mảng (array of arrays) để lấy chính xác theo vị trí cột (index)
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!rows.length) {
    throw new Error("File Excel không có dữ liệu.");
  }

  // Lọc bỏ các dòng trống và tìm các dòng dữ liệu nhiệm vụ (bỏ qua các dòng tiêu đề ở trên)
  // Dựa vào hình ảnh mẫu của bạn, dữ liệu nhiệm vụ bắt đầu từ các hàng có số thứ tự (1, 2, 3...) ở cột đầu tiên
  const taskRows = rows.filter((row) => {
    const firstCol = String(row[0] ?? "").trim();
    // Kiểm tra xem cột đầu tiên có phải là số thứ tự (STT) hay không
    return /^\d+$/.test(firstCol);
  });

  if (!taskRows.length) {
    // Fallback nếu không tìm thấy STT rõ ràng, lấy từ hàng thứ 3 trở đi
    const fallbackRows = rows.slice(2).filter((row) => 
      row.some((cell) => String(cell).trim() !== "")
    );
    if (!fallbackRows.length) throw new Error("Không tìm thấy dữ liệu nhiệm vụ trong file Excel.");
    
    return parseRowsToTasks(fallbackRows);
  }

  return parseRowsToTasks(taskRows);
}

function parseRowsToTasks(taskRows) {
  return taskRows.map((row, index) => {
    // Ánh xạ theo vị trí cột từ file Excel mẫu của bạn:
    // row[0]: STT
    // row[1]: Mã đơn vị
    // row[2]: Mã công việc
    // row[3]: Tên công việc
    // row[4]: Kết quả đầu ra
    // row[5]: Thời hạn hoàn thành
    // row[6]: Loại công việc
    // row[7]: Điểm chuẩn
    // row[8]: Hệ số độ khó (%)
    // row[10] hoặc các cột sau có thể là Minh chứng, Trạng thái, v.v.

    const rawDifficulty = row[8] !== undefined && row[8] !== "" ? row[8] : "100";
    const cleanDifficulty = String(rawDifficulty).replace("%", "").trim();
    const difficultyNum = toNumber(cleanDifficulty, 100);
    const difficultyFactor = difficultyNum > 1 ? difficultyNum / 100 : difficultyNum;

    const baseScore = toNumber(row[7], 10);
    const typeVal = String(row[6] ?? "").trim();

    return {
      id: index + 1,
      unitCode: String(row[1] ?? "").trim() || UNIT_CODE,
      taskCode: String(row[2] ?? "").trim(),
      taskName: String(row[3] ?? "").trim(),
      output: String(row[4] ?? "").trim(),
      deadline: String(row[5] ?? "").trim(),
      type: typeVal || "Thường xuyên",
      baseScore: baseScore,
      difficultyFactor: difficultyFactor > 0 ? difficultyFactor : 1,
      evidence: String(row[10] ?? "").trim(),
      note: String(row[11] ?? "").trim(),
      axis: AXES[0],
      status: String(row[13] ?? "").trim() || "Hoạt động",
      period: DEFAULT_PERIOD,
    };
  });
}