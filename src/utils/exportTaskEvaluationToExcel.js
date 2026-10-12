import ExcelJS from "exceljs";

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export async function exportTaskEvaluationToExcel(tasks, fileName = "Bang_danh_gia_KPI.xlsx") {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Đánh giá KPI");

  // 1. Cấu hình độ rộng 10 cột tương ứng với giao diện
  worksheet.columns = [
    { key: "stt", width: 6 },         // 1. STT (A)
    { key: "taskName", width: 80 },   // 2. Tên công việc (B)
    { key: "baseScore", width: 12 },  // 3. Điểm chuẩn (C)
    { key: "diffFactor", width: 12 }, // 4. Hệ số độ khó (D)
    { key: "maxScore", width: 12 },   // 5. Điểm tối đa (E)
    { key: "progress", width: 14 },   // 6. Tiến độ % (F)
    { key: "result", width: 14 },     // 7. Kết quả % (G)
    { key: "performed", width: 14 },  // 8. Điểm thực hiện (H)
    { key: "actual", width: 12 },     // 9. Điểm thực tế (I)
    { key: "exceeded", width: 12 },   // 10. Vượt mức (J)
  ];

  // 2. Dòng 1: Tiêu đề lớn
  worksheet.mergeCells("A1:J1");
  const titleCell = worksheet.getCell("A1");
  titleCell.value = "BẢNG ĐÁNH GIÁ KẾT QUẢ THỰC HIỆN NHIỆM VỤ (KPI)";
  titleCell.font = { name: "Times New Roman", size: 16, bold: true, color: { argb: "FF1E3A8A" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  worksheet.getRow(1).height = 80;

  // 3. Dòng 2: Tiêu đề cột (Header)
  const headerValues = [
    "STT", "Tên công việc", "Điểm chuẩn", "Hệ số độ khó", "Điểm quy đổi tối đa", 
    "Tiến độ %", "Kết quả %", "Điểm thực hiện", "Điểm quy đổi thực tế", "Vượt mức"
  ];
  const headerRow = worksheet.getRow(2);
  headerRow.values = headerValues;
  headerRow.font = { name: "Times New Roman", size: 13, bold: true, color: { argb: "FF000000" } }; // Chữ màu đen
  headerRow.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  headerRow.height = 90;

  headerRow.eachCell((cell) => {
    cell.fill = { 
      type: "pattern", 
      pattern: "solid", 
      fgColor: { argb: "FFEFEFEF" } // Màu nền xám nhạt
    };
    cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
  });

  let currentRowIndex = 2;
  let totalA = 0;
  let totalB = 0;

  // 4. Nhóm các nhiệm vụ theo thuộc tính `axis` (Trục kết quả)
  const groupedTasks = tasks.reduce((acc, task) => {
    const axisKey = task.axis || "CHƯA PHÂN TRỤC";
    if (!acc[axisKey]) {
      acc[axisKey] = [];
    }
    acc[axisKey].push(task);
    return acc;
  }, {});

  let globalIndex = 0;

  // 5. Duyệt qua từng nhóm trục (Bỏ nền, để trắng)
  Object.entries(groupedTasks).forEach(([axisName, groupItems]) => {
    currentRowIndex++;
    const groupRow = worksheet.getRow(currentRowIndex);
    worksheet.mergeCells(`A${currentRowIndex}:J${currentRowIndex}`);
    groupRow.getCell(1).value = axisName;
    groupRow.font = { name: "Times New Roman", size: 12, bold: true, color: { argb: "FF000000" } };
    groupRow.alignment = { horizontal: "left", vertical: "middle" };
    groupRow.height = 40;

    groupRow.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
      };
    });

    // Duyệt qua các nhiệm vụ trong nhóm trục
    groupItems.forEach((task) => {
      globalIndex++;
      currentRowIndex++;
      const row = worksheet.getRow(currentRowIndex);
      // KHÔNG set cứng row.height ở đây để Excel tự động fix độ cao dựa vào nội dung (wrapText)

      const progress = task.progressPercent ?? 100;
      const result = task.resultPercent ?? 100;
      const baseScore = Number(task.baseScore || 0);
      const diffFactor = Number(task.difficultyFactor || 0);
      
      const maxScore = round2(baseScore * diffFactor);
      const performed = round2(baseScore * ((progress * 0.3 + result * 0.7) / 100));
      const actual = round2(performed * diffFactor);
      
      totalA += maxScore;
      totalB += actual;

      row.values = [
        globalIndex,
        task.taskName || "",
        baseScore,
        `${round2(diffFactor * 100)}%`,
        maxScore,
        `${progress}%`,
        `${result}%`,
        performed,
        actual.toFixed(2),
        task.exceeded ? "X" : ""
      ];

      row.font = { name: "Times New Roman", size: 13 };

      row.eachCell((cell, colNumber) => {
        cell.border = {
            top: { style: "thin", color: { argb: "FF000000" } },
            left: { style: "thin", color: { argb: "FF000000" } },
            bottom: { style: "thin", color: { argb: "FF000000" } },
            right: { style: "thin", color: { argb: "FF000000" } },
        };

        cell.alignment = {
          horizontal: colNumber === 2 ? "left" : "center",
          vertical: "middle",
          wrapText: true,
        };
      });
    });
  });

  totalA = round2(totalA);
  totalB = round2(totalB);

  // 6. Dòng tổng điểm quy đổi (A và B)
  currentRowIndex++;
  const sumRow = worksheet.getRow(currentRowIndex);
  sumRow.height = 35; 

  worksheet.mergeCells(`A${currentRowIndex}:D${currentRowIndex}`);
  sumRow.getCell(1).value = "Điểm giá trị A";
  sumRow.getCell(1).font = { name: "Times New Roman", size: 12, italic: true, bold: true };
  sumRow.getCell(1).alignment = { horizontal: "right", vertical: "middle" };

  sumRow.getCell(5).value = totalA; 
  sumRow.getCell(5).font = { name: "Times New Roman", size: 12, bold: true };
  sumRow.getCell(5).alignment = { horizontal: "center", vertical: "middle" };

  worksheet.mergeCells(`F${currentRowIndex}:H${currentRowIndex}`);
  sumRow.getCell(6).value = "Điểm giá trị B";
  sumRow.getCell(6).font = { name: "Times New Roman", size: 12, italic: true, bold: true };
  sumRow.getCell(6).alignment = { horizontal: "right", vertical: "middle" };

  sumRow.getCell(9).value = totalB.toFixed(2); 
  sumRow.getCell(9).font = { name: "Times New Roman", size: 12, bold: true };
  sumRow.getCell(9).alignment = { horizontal: "center", vertical: "middle" };

  for (let col = 1; col <= 10; col++) {
    const cell = sumRow.getCell(col);
    cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
    };
  }

  // 7. Dòng Điểm KPI đạt được
  currentRowIndex++;
  const rawKpi = totalA > 0 ? (70 * totalB) / totalA : 0;
  const kpi = round2(totalB > totalA ? 70 : rawKpi);

  const kpiRow = worksheet.getRow(currentRowIndex);
  kpiRow.height = 35; 

  worksheet.mergeCells(`B${currentRowIndex}:H${currentRowIndex}`);
  kpiRow.getCell(2).value = "KPI % (trục 4) = B/A*70 điểm (nếu B>A thì KPI là 70)";
  kpiRow.getCell(2).font = { name: "Times New Roman", size: 12, italic: true, bold: true };
  kpiRow.getCell(2).alignment = { horizontal: "left", vertical: "middle" };

  kpiRow.getCell(9).value = kpi.toFixed(2); 
  kpiRow.getCell(9).font = { name: "Times New Roman", size: 12, bold: true };
  kpiRow.getCell(9).alignment = { horizontal: "center", vertical: "middle" };

  for (let col = 1; col <= 10; col++) {
    const cell = kpiRow.getCell(col);
    cell.border = {
        top: { style: "thin", color: { argb: "FF000000" } },
        left: { style: "thin", color: { argb: "FF000000" } },
        bottom: { style: "thin", color: { argb: "FF000000" } },
        right: { style: "thin", color: { argb: "FF000000" } },
    };
  }

  // 8. Tự động tải xuống file Excel
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  window.URL.revokeObjectURL(url);
}