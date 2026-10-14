import React, { useState, useRef, useEffect } from "react";
import {
  ClipboardCheck,
  ListTodo,
  ChartNoAxesCombined,
  Save,
  Upload,
  RefreshCw,
  FileSpreadsheet,
  Download,
} from "lucide-react";

import { unzipSync, zipSync } from "fflate";

import TaskCatalog from "./components/TaskCatalog";
import SelfEvaluation from "./components/SelfEvaluation";
import TaskEvaluation from "./components/TaskEvaluation";
import { TaskCatalogProvider } from "./contexts/TaskCatalogContext";
import { Snackbar, Alert, Menu, MenuItem, ListItemIcon, ListItemText } from "@mui/material";
import { exportTaskCatalogWithExcelJS } from "./utils/exportTaskCatalogExcelJS";

const UNIT_CODE = "A29.192";
const DEFAULT_PERIOD = "(Daotao 15/08)_KPI-Q3-2026";

const START_ROW = 4;
const START_COL = 1;
const COLUMN_COUNT = 15;
const CONCURRENCY = 3;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const XML_NS =
  "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

// Chuyển số cột thành chữ Excel
function columnLetter(column) {
  let result = "";

  while (column > 0) {
    const remainder = (column - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    column = Math.floor((column - 1) / 26);
  }

  return result;
}

// Phân tích XML
function parseXML(content) {
  const xml = new DOMParser().parseFromString(
    content,
    "application/xml"
  );

  if (xml.getElementsByTagName("parsererror").length > 0) {
    throw new Error("XML Excel không hợp lệ");
  }

  return xml;
}

// 🎯 Kiểm tra và lấy đường dẫn sheet cho Danh mục nhiệm vụ (Bắt buộc sheet tên chính xác "01. Mẫu import")
function getTargetCatalogSheetPath(files) {
  const workbookFile = files["xl/workbook.xml"];
  const relsFile = files["xl/_rels/workbook.xml.rels"];

  if (!workbookFile || !relsFile) {
    throw new Error("Cấu trúc file Excel không hợp lệ");
  }

  const workbookXML = parseXML(decoder.decode(workbookFile));
  const relsXML = parseXML(decoder.decode(relsFile));

  const sheets = Array.from(workbookXML.getElementsByTagNameNS(XML_NS, "sheet"));

  const targetSheet = sheets.find((sheet) => {
    const name = sheet.getAttribute("name") || "";
    return name.trim() === "01. Mẫu import";
  });

  if (!targetSheet) {
    throw new Error("File không hợp lệ!");
  }

  const relationshipId = targetSheet.getAttributeNS(REL_NS, "id");
  const relationship = Array.from(
    relsXML.getElementsByTagNameNS(PKG_REL_NS, "Relationship")
  ).find((item) => item.getAttribute("Id") === relationshipId);

  if (!relationship) {
    throw new Error("Không tìm thấy đường dẫn liên kết sheet");
  }

  const target = relationship.getAttribute("Target");
  if (!target) {
    throw new Error("Đường dẫn sheet không hợp lệ");
  }

  if (target.startsWith("/")) {
    return target.slice(1);
  }

  const normalized = [];
  for (const segment of ["xl", ...target.split("/")]) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      normalized.pop();
    } else {
      normalized.push(segment);
    }
  }

  return normalized.join("/");
}

// 🎯 Kiểm tra và lấy đường dẫn sheet chuyên biệt cho file Mẫu 1B (Bắt buộc sheet chứa "1B" hoặc "Mẫu 1B")
function getTargetEvaluationSheetPath(files) {
  const workbookFile = files["xl/workbook.xml"];
  const relsFile = files["xl/_rels/workbook.xml.rels"];

  if (!workbookFile || !relsFile) {
    throw new Error("Cấu trúc file Excel không hợp lệ");
  }

  const workbookXML = parseXML(decoder.decode(workbookFile));
  const relsXML = parseXML(decoder.decode(relsFile));

  const sheets = Array.from(workbookXML.getElementsByTagNameNS(XML_NS, "sheet"));

  const targetSheet = sheets.find((sheet) => {
    const name = sheet.getAttribute("name") || "";
    const lowerName = name.toLowerCase();
    return lowerName.includes("1b") || lowerName.includes("mẫu 1b");
  });

  if (!targetSheet) {
    throw new Error("File không hợp lệ!");
  }

  const relationshipId = targetSheet.getAttributeNS(REL_NS, "id");
  const relationship = Array.from(
    relsXML.getElementsByTagNameNS(PKG_REL_NS, "Relationship")
  ).find((item) => item.getAttribute("Id") === relationshipId);

  if (!relationship) {
    throw new Error("Không tìm thấy đường dẫn liên kết sheet");
  }

  const target = relationship.getAttribute("Target");
  if (!target) {
    throw new Error("Đường dẫn sheet không hợp lệ");
  }

  if (target.startsWith("/")) {
    return target.slice(1);
  }

  const normalized = [];
  for (const segment of ["xl", ...target.split("/")]) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      normalized.pop();
    } else {
      normalized.push(segment);
    }
  }

  return normalized.join("/");
}

// Lấy số thứ tự cột
function getColumnNumber(reference) {
  const letters = reference.replace(/[0-9]/g, "");
  let result = 0;

  for (const letter of letters) {
    result =
      result * 26 + letter.charCodeAt(0) - 64;
  }

  return result;
}

// Tìm hoặc tạo dòng
function getOrCreateRow(sheetData, rowNumber, rowMap) {
  if (rowMap.has(rowNumber)) {
    return rowMap.get(rowNumber);
  }

  const row = sheetData.ownerDocument.createElementNS(
    XML_NS,
    "row"
  );

  row.setAttribute("r", String(rowNumber));

  const rows = Array.from(
    sheetData.getElementsByTagNameNS(XML_NS, "row")
  );

  const nextRow = rows.find(
    (item) => Number(item.getAttribute("r")) > rowNumber
  );

  if (nextRow) {
    sheetData.insertBefore(row, nextRow);
  } else {
    sheetData.appendChild(row);
  }

  rowMap.set(rowNumber, row);
  return row;
}

// Tìm hoặc tạo ô, giữ nguyên style của ô đã tồn tại
function getOrCreateCell(row, reference, cellMap) {
  if (cellMap.has(reference)) {
    return cellMap.get(reference);
  }

  const cell = row.ownerDocument.createElementNS(XML_NS, "c");
  cell.setAttribute("r", reference);

  const targetColumn = getColumnNumber(reference);

  const existingCells = Array.from(
    row.getElementsByTagNameNS(XML_NS, "c")
  );

  const nextCell = existingCells.find(
    (item) =>
      getColumnNumber(item.getAttribute("r")) > targetColumn
  );

  if (nextCell) {
    row.insertBefore(cell, nextCell);
  } else {
    row.appendChild(cell);
  }

  cellMap.set(reference, cell);
  return cell;
}

// Cập nhật giá trị, giữ nguyên thuộc tính style s
function setCellValue(cell, value) {
  for (const child of Array.from(cell.childNodes)) {
    if (
      child.nodeType === 1 &&
      ["f", "v", "is"].includes(child.localName)
    ) {
      cell.removeChild(child);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    cell.removeAttribute("t");

    const valueNode = cell.ownerDocument.createElementNS(
      XML_NS,
      "v"
    );

    valueNode.textContent = String(value);
    cell.appendChild(valueNode);
  } else {
    cell.setAttribute("t", "inlineStr");

    const inlineString = cell.ownerDocument.createElementNS(
      XML_NS,
      "is"
    );

    const textNode = cell.ownerDocument.createElementNS(
      XML_NS,
      "t"
    );

    const text = value == null ? "" : String(value);

    if (/^\s|\s$/.test(text)) {
      textNode.setAttributeNS(
        "http://www.w3.org/XML/1998/namespace",
        "xml:space",
        "preserve"
      );
    }

    textNode.textContent = text;
    inlineString.appendChild(textNode);
    cell.appendChild(inlineString);
  }
}

// Cập nhật XML sheet cho Danh mục nhiệm vụ
function updateSheetXML(xmlContent, batchData) {
  const xml = parseXML(xmlContent);

  const sheetData = xml.getElementsByTagNameNS(
    XML_NS,
    "sheetData"
  )[0];

  if (!sheetData) {
    throw new Error("Sheet không có sheetData");
  }

  const rowMap = new Map();
  const cellMap = new Map();

  for (const row of Array.from(
    sheetData.getElementsByTagNameNS(XML_NS, "row")
  )) {
    const rowNumber = Number(row.getAttribute("r"));

    if (!rowNumber) continue;

    rowMap.set(rowNumber, row);

    for (const cell of Array.from(
      row.getElementsByTagNameNS(XML_NS, "c")
    )) {
      const reference = cell.getAttribute("r");

      if (reference) {
        cellMap.set(reference, cell);
      }
    }
  }

  for (let i = 0; i < batchData.length; i++) {
    const rowNumber = START_ROW + i;

    const row = getOrCreateRow(
      sheetData,
      rowNumber,
      rowMap
    );

    for (let j = 0; j < COLUMN_COUNT; j++) {
      const reference =
        columnLetter(START_COL + j) + rowNumber;

      const cell = getOrCreateCell(
        row,
        reference,
        cellMap
      );

      setCellValue(cell, batchData[i][j]);
    }
  }

  const dimension = xml.getElementsByTagNameNS(
    XML_NS,
    "dimension"
  )[0];

  if (dimension && batchData.length > 0) {
    const currentRef = dimension.getAttribute("ref") || "A1";
    const endpoints = currentRef.split(":");
    const startCell = endpoints[0];
    const endCell = endpoints[endpoints.length - 1];

    const endRowMatch = endCell.match(/\d+$/);
    const currentEndRow = endRowMatch
      ? Number(endRowMatch[0])
      : 1;

    const maxRow = Math.max(
      currentEndRow,
      START_ROW + batchData.length - 1
    );

    const endColumn = Math.max(
      getColumnNumber(endCell),
      COLUMN_COUNT
    );

    dimension.setAttribute(
      "ref",
      `${startCell}:${columnLetter(endColumn)}${maxRow}`
    );
  }

  return new XMLSerializer().serializeToString(xml);
}

// 🎯 Hàm cập nhật XML chuyên biệt cho Mẫu 1B (Bản tự đánh giá)
function updateSelfEvaluationSheetXML(xmlContent, evaluationPayload) {
  const xml = parseXML(xmlContent);
  const sheetData = xml.getElementsByTagNameNS(XML_NS, "sheetData")[0];
  if (!sheetData) throw new Error("Sheet không có sheetData");

  const rowMap = new Map();
  const cellMap = new Map();

  for (const row of Array.from(sheetData.getElementsByTagNameNS(XML_NS, "row"))) {
    const rowNumber = Number(row.getAttribute("r"));
    if (!rowNumber) continue;
    rowMap.set(rowNumber, row);
    for (const cell of Array.from(row.getElementsByTagNameNS(XML_NS, "c"))) {
      const reference = cell.getAttribute("r");
      if (reference) cellMap.set(reference, cell);
    }
  }

  const {
    achievedScores = {},
    criteriaGroups = [],
    normalizedGroupBScore = 0,
    classification = "Hoàn thành tốt nhiệm vụ",
    quarter = "3",
    year = "2026"
  } = evaluationPayload;

  // 1. Ô F3: Ngày tháng
  {
    const row = getOrCreateRow(sheetData, 3, rowMap);
    const cell = getOrCreateCell(row, "F3", cellMap);
    setCellValue(cell, "Bình Khánh, ngày 20 tháng 08 năm 2026");
  }

  // 1.1. Ô A5: Ghi Quý/Năm
  {
    const row = getOrCreateRow(sheetData, 5, rowMap);
    const cell = getOrCreateCell(row, "A5", cellMap);
    setCellValue(cell, `(Quý ${quarter}, Năm ${year})`);
  }

  const allItems = [];
  criteriaGroups.forEach((group) => {
    if (group.items) allItems.push(...group.items);
  });

  const group1Rows = [16, 17, 18, 19, 20, 21, 22, 23, 24];
  const group2Rows = [26, 27, 28];
  const group3Rows = [30, 31, 32, 33];

  let sumGroup1 = 0;
  let sumGroup2 = 0;
  let sumGroup3 = 0;

  let itemIdx = 0;

  // --- GHI ĐIỂM NHÓM 1 ---
  group1Rows.forEach((rowNum) => {
    if (allItems[itemIdx]) {
      const score = Number(achievedScores[allItems[itemIdx].id] ?? 0);
      sumGroup1 += score;

      const row = getOrCreateRow(sheetData, rowNum, rowMap);
      const cell = getOrCreateCell(row, `H${rowNum}`, cellMap);
      setCellValue(cell, score);
    }
    itemIdx++;
  });

  {
    const row = getOrCreateRow(sheetData, 15, rowMap);
    const cell = getOrCreateCell(row, "H15", cellMap);
    setCellValue(cell, sumGroup1);
  }

  // --- GHI ĐIỂM NHÓM 2 ---
  group2Rows.forEach((rowNum) => {
    if (allItems[itemIdx]) {
      const score = Number(achievedScores[allItems[itemIdx].id] ?? 0);
      sumGroup2 += score;

      const row = getOrCreateRow(sheetData, rowNum, rowMap);
      const cell = getOrCreateCell(row, `H${rowNum}`, cellMap);
      setCellValue(cell, score);
    }
    itemIdx++;
  });

  {
    const row = getOrCreateRow(sheetData, 25, rowMap);
    const cell = getOrCreateCell(row, "H25", cellMap);
    setCellValue(cell, sumGroup2);
  }

  // --- GHI ĐIỂM NHÓM 3 ---
  group3Rows.forEach((rowNum) => {
    if (allItems[itemIdx]) {
      const score = Number(achievedScores[allItems[itemIdx].id] ?? 0);
      sumGroup3 += score;

      const row = getOrCreateRow(sheetData, rowNum, rowMap);
      const cell = getOrCreateCell(row, `H${rowNum}`, cellMap);
      setCellValue(cell, score);
    }
    itemIdx++;
  });

  {
    const row = getOrCreateRow(sheetData, 29, rowMap);
    const cell = getOrCreateCell(row, "H29", cellMap);
    setCellValue(cell, sumGroup3);
  }

  // --- TỔNG NHÓM A (H34) ---
  const totalGroupA = sumGroup1 + sumGroup2 + sumGroup3;
  {
    const row = getOrCreateRow(sheetData, 34, rowMap);
    const cell = getOrCreateCell(row, "H34", cellMap);
    setCellValue(cell, totalGroupA);
  }

  // --- TỔNG NHÓM B (H37) ---
  {
    const row = getOrCreateRow(sheetData, 37, rowMap);
    const cell = getOrCreateCell(row, "H37", cellMap);
    setCellValue(cell, Number(normalizedGroupBScore));
  }

  // --- TỔNG CỘNG A + B (H38) ---
  {
    const finalTotal = Math.round((totalGroupA + Number(normalizedGroupBScore)) * 100) / 100;
    const row = getOrCreateRow(sheetData, 38, rowMap);
    const cell = getOrCreateCell(row, "H38", cellMap);
    setCellValue(cell, finalTotal);
  }

  // --- XẾP LOẠI (B39) ---
  {
    const row = getOrCreateRow(sheetData, 39, rowMap);
    const cell = getOrCreateCell(row, "B39", cellMap);
    const fullText = `II. Tự đề xuất xếp loại mức chất lượng: ${classification}...........................................................................................................`;
    setCellValue(cell, fullText);
  }

  return new XMLSerializer().serializeToString(xml);
}

export default function App() {
  // Khởi tạo activeTab đọc từ localStorage để khi F5 không bị mất tab hiện tại
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('global_active_tab') || "evaluation";
  });

  // Hàm chuyển tab đồng thời lưu lại vào localStorage
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('global_active_tab', tabId);
  };
  const [groupBScore, setGroupBScore] = useState(0);
  // Khởi tạo tasks đọc từ localStorage để không bị mất khi F5
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('global_tasks');
    return savedTasks ? JSON.parse(savedTasks) : [];
  });

  // Hàm cập nhật tasks đồng thời lưu vào localStorage
  const handleTasksChange = (newTasks) => {
    const updatedTasks = typeof newTasks === 'function' ? newTasks(tasks) : newTasks;
    setTasks(updatedTasks);
    localStorage.setItem('global_tasks', JSON.stringify(updatedTasks));
  };

  // State theo dõi kích thước màn hình để tự động co giãn nhãn Tab chuẩn xác
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // State dùng chung
  // Khởi tạo state đọc từ localStorage để khi F5 không bị mất quý/năm đang chọn
  const [globalQuarter, setGlobalQuarter] = useState(() => {
    return localStorage.getItem('global_quarter') || "4";
  });
  const [globalYear, setGlobalYear] = useState(() => {
    return localStorage.getItem('global_year') || "2026";
  });
  const [globalTeacherName, setGlobalTeacherName] = useState(() => {
    return localStorage.getItem('global_teacher_name') || "Phạm Văn Thái";
  });

  // 🎯 Thêm các hàm handler để cập nhật state và lưu vào localStorage khi người dùng thay đổi Quý/Năm/Tên
  const handleQuarterChange = (newQuarter) => {
    setGlobalQuarter(newQuarter);
    localStorage.setItem('global_quarter', newQuarter);
  };

  const handleYearChange = (newYear) => {
    setGlobalYear(newYear);
    localStorage.setItem('global_year', newYear);
  };

  const handleTeacherNameChange = (newName) => {
    setGlobalTeacherName(newName);
    localStorage.setItem('global_teacher_name', newName);
  };

  // Menu dropdown state
  const [anchorEl, setAnchorEl] = useState(null);
  const openMenu = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Refs
  const selfEvalRef = useRef(null);
  const taskCatalogRef = useRef(null);
  const taskEvaluationRef = useRef(null);
  const importFileRef = useRef(null);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (taskCatalogRef.current?.importExcel) {
      taskCatalogRef.current.importExcel(file);
    } else {
      setSnackbar({
        open: true,
        message: "Trang Danh mục nhiệm vụ chưa hỗ trợ import Excel!",
        severity: "warning",
      });
    }
    event.target.value = "";
  };

  const handleUpdateSingleFile = async (batchData) => {
    if (!window.showOpenFilePicker) {
      setSnackbar({
        open: true,
        message: "Trình duyệt không hỗ trợ chọn file.",
        severity: "error",
      });
      return;
    }

    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "Excel Files",
            accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] },
          },
        ],
        multiple: false,
      });

      if (!fileHandle) return;

      if ((await fileHandle.queryPermission({ mode: "readwrite" })) !== "granted") {
        if ((await fileHandle.requestPermission({ mode: "readwrite" })) !== "granted") {
          setSnackbar({
            open: true,
            message: "Bạn chưa cấp quyền ghi file!",
            severity: "warning",
          });
          return;
        }
      }

      // 🎯 Mở file, kiểm tra và cập nhật tùy theo tab hiện tại
      const file = await fileHandle.getFile();
      const buffer = new Uint8Array(await file.arrayBuffer());
      const zipFiles = unzipSync(buffer);
      delete zipFiles["xl/calcChain.xml"];

      const writable = await fileHandle.createWritable();

      try {
        if (activeTab === "evaluation") {
          // 1. Kiểm tra sheet Tự đánh giá
          const sheetPath = getTargetEvaluationSheetPath(zipFiles);
          const sheetBytes = zipFiles[sheetPath];
          if (!sheetBytes) {
            throw new Error("File không hợp lệ");
          }

          const rawEvalData = selfEvalRef.current?.getCurrentData ? selfEvalRef.current.getCurrentData() : null;
          const evaluationData = {
            ...rawEvalData,
            quarter: globalQuarter,
            year: globalYear
          };

          const updatedXML = updateSelfEvaluationSheetXML(
            decoder.decode(sheetBytes),
            evaluationData || {}
          );
          zipFiles[sheetPath] = encoder.encode(updatedXML);

        } else if (activeTab === "catalog") {
          // 2. Kiểm tra sheet Danh mục ("01. Mẫu import")
          const sheetPath = getTargetCatalogSheetPath(zipFiles);
          const sheetBytes = zipFiles[sheetPath];
          if (!sheetBytes) {
            throw new Error("File không hợp lệ");
          }

          const updatedXML = updateSheetXML(
            decoder.decode(sheetBytes),
            batchData
          );
          zipFiles[sheetPath] = encoder.encode(updatedXML);
        }

        const output = zipSync(zipFiles, { level: 1 });
        await writable.write(output);
        await writable.close();

        setSnackbar({
          open: true,
          message: "Cập nhật file thành công!",
          severity: "success",
        });

      } catch (error) {
        await writable.abort().catch(() => {});
        setSnackbar({
          open: true,
          message: error.message || "File không hợp lệ!",
          severity: "error",
        });
      }

    } catch (error) {
      if (error.name !== "AbortError") {
        setSnackbar({
          open: true,
          message: "Không thể mở file hoặc đã hủy.",
          severity: "error",
        });
      }
    }
  };

  const handleDownloadNewFile = async () => {
    try {
      setSnackbar({
        open: true,
        message: "Đang tạo và tải file Excel mới...",
        severity: "info",
      });

      await exportTaskCatalogWithExcelJS(tasks, `Danh_muc_nhiem_vu_Q${globalQuarter}_${globalYear}.xlsx`);

      setSnackbar({
        open: true,
        message: "Tải file Excel mới thành công!",
        severity: "success",
      });
    } catch (error) {
      console.error("Lỗi xuất file Excel:", error);
      setSnackbar({
        open: true,
        message: "Không thể tải file mới: " + (error.message || "Lỗi hệ thống"),
        severity: "error",
      });
    }
  };

  const handleExportFileChoice = (mode) => {
    handleCloseMenu();

    if (activeTab === "evaluation") {
      if (mode === "file") {
        handleUpdateSingleFile(null);
      }
      return;
    }

    if (activeTab === "catalog") {
      if (!tasks?.length) {
        setSnackbar({
          open: true,
          message: "Danh sách nhiệm vụ đang trống!",
          severity: "warning",
        });
        return;
      }

      if (mode === "downloadNew") {
        handleDownloadNewFile();
        return;
      }

      const batchData = tasks.map((task, index) => {
        const baseScore = Number(task.baseScore ?? 10);
        const difficultyFactor = Number(task.difficultyFactor ?? 1);

        return [
          index + 1,
          task.unitCode || UNIT_CODE,
          task.taskCode || "",
          task.taskName || "",
          task.output || "",
          task.deadline || "",
          task.type || "Thường xuyên",
          baseScore,
          `${Math.round(difficultyFactor * 100)}%`,
          Math.round(baseScore * difficultyFactor * 100) / 100,
          task.evidence || "",
          task.note || "",
          task.axis || "",
          task.status || "Hoạt động",
          task.period || DEFAULT_PERIOD,
        ];
      });

      if (mode === "file") {
        handleUpdateSingleFile(batchData);
      }
      return;
    }

    if (activeTab === "taskEvaluation") {
      if (taskEvaluationRef.current?.exportExcel) {
        taskEvaluationRef.current.exportExcel();
      } else {
        setSnackbar({
          open: true,
          message: "Trang Đánh giá kết quả chưa hỗ trợ export Excel!",
          severity: "warning",
        });
      }
    }
  };

  const [taskStats, setTaskStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    exceededTasks: 0,
  });

  const tabs = [
    {
      id: "evaluation",
      label: "Bản tự đánh giá",
      shortLabel: "Tự đánh giá",
      icon: ClipboardCheck,
    },
    {
      id: "catalog",
      label: "Danh mục nhiệm vụ",
      shortLabel: "Danh mục",
      icon: ListTodo,
    },
    {
      id: "taskEvaluation",
      label: "Đánh giá kết quả",
      shortLabel: "Kết quả KPI",
      icon: ChartNoAxesCombined,
    },
  ];

  const handleGlobalSave = () => {
    if (activeTab === "evaluation") {
      if (selfEvalRef.current?.save) {
        selfEvalRef.current.save();
      }
    } else if (activeTab === "catalog") {
      if (taskCatalogRef.current?.save) {
        taskCatalogRef.current.save();
      } else {
        setSnackbar({
          open: true,
          message: "Chưa kết nối được với trang Danh mục nhiệm vụ!",
          severity: "warning",
        });
      }
    } else if (activeTab === "taskEvaluation") {
      if (taskEvaluationRef.current?.save) {
        taskEvaluationRef.current.save();
      } else {
        setSnackbar({
          open: true,
          message: "Chưa kết nối được với trang Đánh giá kết quả!",
          severity: "warning",
        });
      }
    }
  };

  return (
    <TaskCatalogProvider>
      <div
        style={{
          minHeight: "100vh",
          backgroundColor: "#f8fafc",
          color: "#334155",
          padding: "12px",
        }}
      >
        <main
          style={{
            maxWidth: "1600px",
            margin: "0 auto",
          }}
        >
          {/* Thanh điều hướng và nút thao tác phân tách rõ ràng trái/phải */}
          <div
            style={{
              position: "sticky",
              top: "0px",
              zIndex: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
              backgroundColor: "#f8fafc",
              padding: "8px 4px",
              boxShadow: "0 4px 6px -4px rgba(0, 0, 0, 0.05)",
              flexWrap: "wrap",
            }}
          >
            {/* 1. Phía bên trái: Các Tab điều hướng */}
            <nav
              style={{
                backgroundColor: "#ffffff",
                padding: "4px",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: "4px",
                boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
                width: "100%",
                maxWidth: "520px",
              }}
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabChange(tab.id)} // 🎯 Đổi từ setActiveTab thành handleTabChange ở đây
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "8px 6px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "12px",
                      transition: "all 0.2s",
                      backgroundColor: isActive ? "#2563eb" : "transparent",
                      color: isActive ? "#ffffff" : "#475569",
                      boxShadow: isActive
                        ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
                        : "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2.4 : 1.8}
                      style={{ flexShrink: 0 }}
                    />
                    <span>{isMobile ? tab.shortLabel : tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* 2. Phía bên phải: Nhóm các nút hành động (Nhập file, Xuất file, Lưu) */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <input
                ref={importFileRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleImportFile}
              />

              {/* Nút Nhập file */}
              {activeTab === "catalog" && (
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "9px 14px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                    fontWeight: 600,
                    fontSize: "13px",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Upload size={16} className="text-gray-500" />
                  <span>Nhập file</span>
                </button>
              )}

              {/* Nút Xuất file */}
              {(activeTab === "catalog" ||
                activeTab === "evaluation" ||
                activeTab === "taskEvaluation") && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (activeTab === "taskEvaluation") {
                        if (taskEvaluationRef.current?.exportExcel) {
                          taskEvaluationRef.current.exportExcel();
                        } else {
                          setSnackbar({
                            open: true,
                            message: "Trang Đánh giá kết quả chưa hỗ trợ export Excel!",
                            severity: "warning",
                          });
                        }
                      } else {
                        handleOpenMenu(e);
                      }
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "9px 14px",
                      borderRadius: "10px",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                      backgroundColor: "#ffffff",
                      color: "#475569",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Download size={16} className="text-gray-500" />
                    <span>Xuất file</span>
                  </button>

                  {/* Menu cho tab Bản tự đánh giá (evaluation) */}
                  {activeTab === "evaluation" && (
                    <Menu
                      anchorEl={anchorEl}
                      open={openMenu}
                      onClose={handleCloseMenu}
                      PaperProps={{
                        sx: {
                          borderRadius: 2,
                          mt: 1,
                          minWidth: 220,
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        },
                      }}
                    >
                      <MenuItem onClick={() => handleExportFileChoice("file")}>
                        <ListItemIcon>
                          <FileSpreadsheet size={18} color="#2563eb" />
                        </ListItemIcon>
                        <ListItemText primary="Chọn file từ máy tính" secondary="Cập nhật Bản tự đánh giá" />
                      </MenuItem>
                    </Menu>
                  )}

                  {/* Menu cho tab Danh mục nhiệm vụ */}
                  {activeTab === "catalog" && (
                    <Menu
                      anchorEl={anchorEl}
                      open={openMenu}
                      onClose={handleCloseMenu}
                      PaperProps={{
                        sx: {
                          borderRadius: 2,
                          mt: 1,
                          minWidth: 220,
                          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)",
                        },
                      }}
                    >
                      <MenuItem onClick={() => handleExportFileChoice("file")}>
                        <ListItemIcon>
                          <FileSpreadsheet size={18} color="#2563eb" />
                        </ListItemIcon>
                        <ListItemText primary="Chọn file từ máy tính" secondary="Cập nhật Danh mục nhiệm vụ" />
                      </MenuItem>

                      <MenuItem onClick={() => handleExportFileChoice("downloadNew")}>
                        <ListItemIcon>
                          <Download size={18} color="#d97706" />
                        </ListItemIcon>
                        <ListItemText primary="Tải về file mới" secondary="Tạo và tải file excel mới" />
                      </MenuItem>
                    </Menu>
                  )}
                </>
              )}

              {/* Nút Lưu (Primary Action đặt ở ngoài cùng bên phải) */}
              <button
                type="button"
                onClick={handleGlobalSave}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "9px 18px",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "13px",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)",
                  transition: "all 0.2s ease",
                }}
              >
                <Save size={16} strokeWidth={2.2} />
                <span>Lưu</span>
              </button>
            </div>
          </div>

          {/* Nội dung trang */}
          <section
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "16px",
            }}
          >
            {activeTab === "evaluation" && (
              <SelfEvaluation
                ref={selfEvalRef}
                activeTab={activeTab}
                groupBScore={groupBScore}
                taskStats={taskStats}
                quarter={globalQuarter}
                year={globalYear}
                teacherName={globalTeacherName}
                onQuarterChange={handleQuarterChange}
                onYearChange={handleYearChange}
                onTeacherNameChange={handleTeacherNameChange}
                onNavigateCatalog={() => setActiveTab("catalog")}
              />
            )}

            {activeTab === "catalog" && (
              <TaskCatalog
                ref={taskCatalogRef}
                activeTab={activeTab}
                tasks={tasks}
                onTasksChange={handleTasksChange}
                onScoreChange={setGroupBScore}
                quarter={globalQuarter}             
                year={globalYear}                    
                teacherName={globalTeacherName}      
                onQuarterChange={handleQuarterChange} 
                onYearChange={handleYearChange}      
                onTeacherNameChange={handleTeacherNameChange} 
              />
            )}

            {activeTab === "taskEvaluation" && (
              <TaskEvaluation
                ref={taskEvaluationRef}
                activeTab={activeTab}
                tasks={tasks}
                onTasksChange={setTasks}
                onKpiChange={setGroupBScore}
                onTaskStatsChange={setTaskStats}
                quarter={globalQuarter}
                year={globalYear}
                teacherName={globalTeacherName}
                onQuarterChange={handleQuarterChange}
                onYearChange={handleYearChange}
                onTeacherNameChange={handleTeacherNameChange}
              />
            )}
          </section>
        </main>

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
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </TaskCatalogProvider>
  );
}