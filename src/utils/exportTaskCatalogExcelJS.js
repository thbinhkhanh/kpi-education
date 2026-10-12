import ExcelJS from "exceljs";

export async function exportTaskCatalogWithExcelJS(tasks, fileName = "Danh_muc_nhiem_vu_Q3_2026.xlsx") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Danh muc nhiem vu");

  // 1. Cấu hình chính xác độ rộng các cột từ A đến O theo yêu cầu
  worksheet.columns = [
    { key: "stt", width: 4.42 },       // A (TT)
    { key: "unitCode", width: 14.02 }, // B (Mã đơn vị)
    { key: "taskCode", width: 17.12 }, // C (Mã công việc)
    { key: "taskName", width: 39.72 }, // D (Tên công việc)
    { key: "output", width: 14.32 },   // E (Kết quả đầu ra)
    { key: "deadline", width: 12.62 }, // F (Thời hạn hoàn thành)
    { key: "type", width: 11.62 },     // G (Loại công việc)
    { key: "baseScore", width: 8.92 }, // H (Điểm chuẩn)
    { key: "diffFactor", width: 9.52 },// I (Hệ số độ khó)
    { key: "maxScore", width: 7.92 },  // J (Điểm quy đổi tối đa)
    { key: "evidence", width: 14.42 }, // K (Minh chứng)
    { key: "note", width: 14.42 },     // L (Ghi chú)
    { key: "axis", width: 14.42 },     // M (Trục kết quả)
    { key: "status", width: 14.42 },   // N (Trạng thái)
    { key: "period", width: 14.42 },   // O (Kỳ đánh giá)
  ];

  // 2. Dòng 1: Tiêu đề lớn
  worksheet.mergeCells("A1:O1");

  const titleCell = worksheet.getCell("A1");
  titleCell.value =
    "DANH MỤC SẢN PHẨM CHUẨN\nTổ trưởng chuyên môn - Phạm Văn Thái";

  titleCell.font = {
    name: "Times New Roman",
    size: 16,
    bold: true,
    color: { argb: "FF002060" },
  };

  titleCell.alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };

  worksheet.getRow(1).height = 101;

  // 4. Dòng 3: Tiêu đề các cột (In đậm, căn giữa ngang & dọc, nền màu #FADADE)
  const headerRowValues = [
    "TT", "Mã đơn vị *", "Mã công việc", "Tên công việc *", "Kết quả đầu ra *", 
    "Thời hạn hoàn thành *", "Loại công việc *", "Điểm chuẩn *", "Hệ số độ khó *", 
    "Điểm quy đổi tối đa *", "Minh chứng", "Ghi chú", "Trục kết quả trọng tâm *", "Trạng thái *", "Kỳ đánh giá *"
  ];
  const headerRow = worksheet.getRow(2);
  headerRow.values = headerRowValues;
  headerRow.font = { name: "Times New Roman", size: 12, bold: true };
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 100;

  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFADADE" } }; // Màu nền #FADADE
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  // 5. Dòng 4: Hàng số thứ tự cột có dấu ngoặc đơn (1), (2)..., bỏ in nghiêng, căn giữa
  const indexRowValues = Array.from({ length: 15 }, (_, i) => `(${i + 1})`);
  const indexRow = worksheet.getRow(3);
  indexRow.values = indexRowValues;
  indexRow.font = { name: "Times New Roman", size: 10, bold: false, italic: false, color: { argb: "FF000000" } };
  indexRow.alignment = { horizontal: "center", vertical: "middle" };
  indexRow.height = 22;

  indexRow.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FF000000" } },
      left: { style: "thin", color: { argb: "FF000000" } },
      bottom: { style: "thin", color: { argb: "FF000000" } },
      right: { style: "thin", color: { argb: "FF000000" } },
    };
  });

  // 6. Dữ liệu nhiệm vụ bắt đầu từ Dòng 5 (Cỡ chữ 12, căn giữa theo chiều dọc cho toàn bộ các ô)
  tasks.forEach((task, index) => {
    const rowIndex = index + 4;
    const convertedScore =
      Math.round(
        Number(task.baseScore || 0) * Number(task.difficultyFactor || 1) * 100
      ) / 100;

    const difficultyPercent = `${Math.round(Number(task.difficultyFactor ?? 1) * 100)}%`;

    const row = worksheet.getRow(rowIndex);
    row.values = [
      index + 1,                               // A: STT
      task.unitCode || "A29.192",              // B: Mã đơn vị
      task.taskCode || "",                     // C: Mã công việc
      task.taskName || "",                     // D: Tên công việc
      task.output || "",                       // E: Kết quả đầu ra
      task.deadline || "",                     // F: Thời hạn hoàn thành
      task.type || "Thường xuyên",             // G: Loại công việc
      Number(task.baseScore ?? 10),            // H: Điểm chuẩn
      difficultyPercent,                       // I: Hệ số độ khó
      convertedScore,                          // J: Điểm quy đổi tối đa
      task.evidence || "",                     // K: Minh chứng
      task.note || "",                         // L: Ghi chú
      task.axis || "",                         // M: Trục kết quả
      task.status || "Hoạt động",              // N: Trạng thái
      task.period || "(Daotao 15/08)_KPI-Q3-2026", // O: Kỳ đánh giá
    ];

    // Đặt cỡ chữ bảng dữ liệu là 12
    row.font = { name: "Times New Roman", size: 12 };

    // Kẻ khung và căn giữa theo chiều dọc cho tất cả các cột
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };

      const isLongTextCol = [4, 5, 11, 13, 15].includes(colNumber);
      
      cell.alignment = {
        horizontal: isLongTextCol ? "left" : "center",
        vertical: "middle",
        wrapText: true,
      };
    });
  });

    // Tạo dropdown cho cột M - Trục kết quả trọng tâm
  const axisOptions = [
    "TRỤC 1 - THỰC HIỆN MỤC TIÊU PHÁT TRIỂN KINH TẾ - XÃ HỘI VÀ NHIỆM VỤ CHÍNH TRỊ ĐƯỢC GIAO",
    "TRỤC 2 - HOÀN THIỆN THỂ CHẾ, ĐẨY MẠNH PHÂN CẤP, PHÂN QUYỀN GẮN VỚI KIỂM TRA, GIÁM SÁT",
    "TRỤC 3 - THÚC ĐẨY PHÁT TRIỂN KHOA HỌC, CÔNG NGHỆ, ĐỔI MỚI SÁNG TẠO VÀ CHUYỂN ĐỔI SỐ",
    "TRỤC 4 - XÂY DỰNG ĐẢNG VÀ HỆ THỐNG CHÍNH TRỊ TRONG SẠCH, VỮNG MẠNH; GIỮ GÌN ĐOÀN KẾT, THỐNG NHẤT NỘI BỘ; PHÒNG, CHỐNG THAM NHŨNG, LÃNG PHÍ, TIÊU CỰC",
    "TRỤC 5 - PHÁT TRIỂN VĂN HÓA, CON NGƯỜI, BẢO ĐẢM AN SINH XÃ HỘI, NÂNG CAO ĐỜI SỐNG NHÂN DÂN",
    "TRỤC 6 - CỦNG CỐ QUỐC PHÒNG, AN NINH, GIỮ VỮNG ỔN ĐỊNH CHÍNH TRỊ - XÃ HỘI, NÂNG CAO HIỆU QUẢ ĐỐI NGOẠI VÀ HỘI NHẬP QUỐC TẾ",
  ];

  // Danh sách dùng làm nguồn cho dropdown
  const axisSheet = workbook.addWorksheet("Danh sach");
  axisOptions.forEach((axis, index) => {
    axisSheet.getCell(`A${index + 1}`).value = axis;
  });
  axisSheet.state = "veryHidden";

  // Áp dụng dropdown cho cột M, từ dòng dữ liệu đầu tiên đến dòng 1000
  for (let row = 4; row <= 1000; row++) {
    worksheet.getCell(`M${row}`).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: [`'Danh sach'!$A$1:$A$6`],
      showErrorMessage: true,
      errorTitle: "Giá trị không hợp lệ",
      error: "Vui lòng chọn một trục trong danh sách.",
    };
  }

  // 7. Tạo file và tự động tải xuống
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}