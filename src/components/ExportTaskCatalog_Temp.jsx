
import React, { useState } from "react";
import {
  Box,
  Button,
  Card,
  Typography,
  Stack,
  LinearProgress,
  Alert,
  IconButton,
} from "@mui/material";

import { unzipSync, zipSync } from "fflate";
import CloseIcon from "@mui/icons-material/Close";

const UNIT_CODE = "A29.192";
const DEFAULT_PERIOD = "(Daotao 15/08)_KPI-Q3-2026";

const START_ROW = 4;
const START_COL = 1;
const COLUMN_COUNT = 15;
const CONCURRENCY = 3;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const XML_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL_NS =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL_NS =
  "http://schemas.openxmlformats.org/package/2006/relationships";

// Chuyển số cột thành chữ Excel: 1 -> A, 15 -> O
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
  const xml = new DOMParser().parseFromString(content, "application/xml");

  if (xml.getElementsByTagName("parsererror").length > 0) {
    throw new Error("XML Excel không hợp lệ");
  }

  return xml;
}

// Đọc đường dẫn sheet đầu tiên từ workbook.xml và workbook.xml.rels
function getFirstSheetPath(files) {
  const workbookFile = files["xl/workbook.xml"];
  const relsFile = files["xl/_rels/workbook.xml.rels"];

  if (!workbookFile || !relsFile) {
    throw new Error("Không tìm thấy cấu trúc workbook Excel");
  }

  const workbookXML = parseXML(decoder.decode(workbookFile));
  const relsXML = parseXML(decoder.decode(relsFile));

  const firstSheet = workbookXML.getElementsByTagNameNS(
    XML_NS,
    "sheet"
  )[0];

  if (!firstSheet) {
    throw new Error("Workbook không có sheet");
  }

  const relationshipId = firstSheet.getAttributeNS(REL_NS, "id");

  const relationship = Array.from(
    relsXML.getElementsByTagNameNS(PKG_REL_NS, "Relationship")
  ).find((item) => item.getAttribute("Id") === relationshipId);

  if (!relationship) {
    throw new Error("Không tìm thấy đường dẫn sheet đầu tiên");
  }

  const target = relationship.getAttribute("Target");

  if (!target) {
    throw new Error("Đường dẫn sheet không hợp lệ");
  }

  if (target.startsWith("/")) {
    return target.slice(1);
  }

  const segments = ["xl", ...target.split("/")];
  const normalized = [];

  for (const segment of segments) {
    if (!segment || segment === ".") continue;

    if (segment === "..") {
      normalized.pop();
    } else {
      normalized.push(segment);
    }
  }

  return normalized.join("/");
}

// Sắp xếp ô theo thứ tự cột
function getColumnNumber(cellReference) {
  const letters = cellReference.replace(/[0-9]/g, "");
  let result = 0;

  for (const letter of letters) {
    result =
      result * 26 + letter.charCodeAt(0) - 64;
  }

  return result;
}

// Tìm hoặc tạo dòng Excel
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

// Tìm hoặc tạo ô, giữ nguyên style nếu ô đã tồn tại
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

// Thay giá trị ô nhưng giữ thuộc tính style (s)

function setCellValue(cell, value) {
  // Chỉ xóa nội dung cũ, giữ nguyên thuộc tính và style của ô
  for (const child of Array.from(cell.childNodes)) {
    if (
      child.nodeType === 1 &&
      ["f", "v", "is"].includes(child.localName)
    ) {
      cell.removeChild(child);
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    // Ghi số trực tiếp, giữ nguyên style s của ô
    cell.removeAttribute("t");

    const valueNode = cell.ownerDocument.createElementNS(
      XML_NS,
      "v"
    );

    valueNode.textContent = String(value);
    cell.appendChild(valueNode);
  } else {
    // Ghi chuỗi inline, không thay đổi style của ô
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

// Cập nhật XML của sheet, không dựng lại workbook
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

  // Ghi dữ liệu từ A4 đến O...
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

  // Cập nhật vùng dữ liệu để Excel nhận diện các ô mới
  const dimension = xml.getElementsByTagNameNS(
    XML_NS,
    "dimension"
  )[0];

  if (dimension) {
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

export default function ExportTaskCatalog({
  tasks = [],
  onBack,
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [folderHandle, setFolderHandle] = useState(null);

  const [updatedFiles, setUpdatedFiles] = useState([]);
  const [skipped, setSkipped] = useState([]);

  const handleSelectFolder = async () => {
    setMessage("");

    try {
      const handle = await window.showDirectoryPicker({
        mode: "readwrite",
      });

      setFolderHandle(handle);
    } catch {
      setMessage("❌ Không thể mở thư mục hoặc bạn đã hủy.");
    }
  };

  const handleExportAll = async () => {
    if (!folderHandle) {
      setMessage("⚠️ Vui lòng chọn thư mục trước khi xuất!");
      return;
    }

    if (!tasks?.length) {
      setMessage("⚠️ Danh sách nhiệm vụ đang trống!");
      return;
    }

    setLoading(true);
    setSuccess(false);
    setProgress(0);
    setMessage("");
    setUpdatedFiles([]);
    setSkipped([]);

    try {
      // Chuẩn bị dữ liệu một lần
      const batchData = tasks.map((task, index) => {
        const baseScore = Number(task.baseScore ?? 10);
        const difficultyFactor = Number(
          task.difficultyFactor ?? 1
        );

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
          Math.round(
            baseScore * difficultyFactor * 100
          ) / 100,
          task.evidence || "",
          task.note || "",
          task.axis || "",
          task.status || "Hoạt động",
          task.period || DEFAULT_PERIOD,
        ];
      });

      // Lấy file XLSX trong thư mục
      const files = [];

      for await (const entry of folderHandle.values()) {
        if (
          entry.kind === "file" &&
          entry.name.toLowerCase().endsWith(".xlsx") &&
          !entry.name.startsWith("~$")
        ) {
          files.push(entry);
        }
      }

      if (!files.length) {
        setMessage("⚠️ Không tìm thấy file .xlsx nào trong thư mục!");
        return;
      }

      const updated = [];
      const errors = [];

      let completed = 0;
      let nextIndex = 0;

      // Sửa trực tiếp XML của từng file
      const processFile = async (fileEntry) => {
        try {
          const file = await fileEntry.getFile();
          const buffer = new Uint8Array(
            await file.arrayBuffer()
          );

          // Giải nén XLSX
          const zipFiles = unzipSync(buffer);

          // Xác định sheet đầu tiên
          const sheetPath = getFirstSheetPath(zipFiles);
          const sheetBytes = zipFiles[sheetPath];

          if (!sheetBytes) {
            throw new Error(
              `Không tìm thấy sheet: ${sheetPath}`
            );
          }

          // Sửa XML sheet, giữ nguyên các thành phần khác
          const sheetXML = decoder.decode(sheetBytes);

          const updatedXML = updateSheetXML(
            sheetXML,
            batchData
          );

          zipFiles[sheetPath] = encoder.encode(updatedXML);

          // Nén lại ZIP với mức nén thấp để ưu tiên tốc độ
          const output = zipSync(zipFiles, {
            level: 1,
          });

          // Ghi đè file
          const writable = await fileEntry.createWritable();

          try {
            await writable.write(output);
            await writable.close();
          } catch (error) {
            await writable.abort().catch(() => {});
            throw error;
          }

          updated.push(fileEntry.name);
        } catch (error) {
          console.error(
            `Lỗi xử lý ${fileEntry.name}:`,
            error
          );

          errors.push(
            `${fileEntry.name}: ${
              error.message || "Lỗi xử lý file"
            }`
          );
        } finally {
          completed++;

          setProgress(
            Math.round((completed / files.length) * 100)
          );
        }
      };

      // Giới hạn số file xử lý đồng thời
      const worker = async () => {
        while (true) {
          const index = nextIndex++;

          if (index >= files.length) return;

          await processFile(files[index]);
        }
      };

      await Promise.all(
        Array.from(
          {
            length: Math.min(CONCURRENCY, files.length),
          },
          () => worker()
        )
      );

      setUpdatedFiles(updated);
      setSkipped(errors);
      setSuccess(errors.length === 0);

      setMessage(
        `Hoàn tất: cập nhật thành công ${updated.length}/${files.length} file Excel.` +
          (errors.length
            ? ` Có ${errors.length} file gặp lỗi.`
            : "")
      );
    } catch (error) {
      console.error("Lỗi hệ thống:", error);

      setMessage(
        "❌ Có lỗi xảy ra khi cập nhật dữ liệu vào thư mục."
      );

      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f8fafc",
        py: 4,
      }}
    >
      <Card
        elevation={0}
        sx={{
          maxWidth: 520,
          mx: "auto",
          borderRadius: 3,
          overflow: "hidden",
          border: "1px solid #e2e8f0",
          bgcolor: "#fff",
        }}
      >
        <Box
          sx={{
            px: 3,
            pr: 1.5,
            py: 1.5,
            bgcolor: "#1976d2",
            color: "#fff",
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              sx={{ fontSize: 18, fontWeight: 700 }}
            >
              Cập nhật Danh mục nhiệm vụ hàng loạt
            </Typography>

            <IconButton
              onClick={onBack}
              sx={{
                color: "#fff",
                bgcolor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                transition: "all .2s ease",
                "&:hover": {
                  bgcolor: "#fff",
                  color: "#ef4444",
                  transform: "scale(1.05)",
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ p: 3 }}>
          <Stack spacing={2.2}>
            {/* Chọn thư mục */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
              }}
            >
              <Button
                fullWidth
                variant="outlined"
                onClick={handleSelectFolder}
              >
                📁 Chọn thư mục chứa file Excel
              </Button>

              {folderHandle && (
                <Typography
                  sx={{
                    mt: 1,
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  Thư mục: <b>{folderHandle.name}</b>
                </Typography>
              )}
            </Box>

            {/* Bắt đầu cập nhật */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                border: "1px solid #e2e8f0",
                bgcolor: "#fff",
              }}
            >
              <Button
                fullWidth
                variant="contained"
                onClick={handleExportAll}
                disabled={loading || !folderHandle}
                sx={{
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: 2,
                  boxShadow: "none",
                }}
              >
                Bắt đầu xuất
              </Button>
            </Box>

            {/* Tiến độ */}
            {loading && (
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  border: "1px solid #e2e8f0",
                }}
              >
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    height: 8,
                    borderRadius: 5,
                  }}
                />

                <Typography
                  sx={{
                    mt: 1,
                    textAlign: "center",
                    fontSize: 13,
                    color: "#64748b",
                  }}
                >
                  Đang xử lý... {progress}%
                </Typography>
              </Box>
            )}

            {/* Thông báo */}
            {message && !loading && (
              <Alert severity={success ? "success" : "error"}>
                {message}
              </Alert>
            )}

            {/* Kết quả */}
            {!loading &&
              (updatedFiles.length > 0 ||
                skipped.length > 0) && (
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid #e2e8f0",
                    bgcolor: "#fff",
                  }}
                >
                  {updatedFiles.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: "green",
                          mb: 1,
                        }}
                      >
                        ✅ Cập nhật thành công:
                      </Typography>

                      <Typography
                        sx={{
                          ml: 2,
                          fontSize: 13,
                          color: "#475569",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {updatedFiles.join(", ")}
                      </Typography>
                    </Box>
                  )}

                  {skipped.length > 0 && (
                    <Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          color: "#ef4444",
                          mb: 1,
                        }}
                      >
                        ❌ Bỏ qua / lỗi:
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 13,
                          ml: 2,
                          color: "#475569",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {skipped.join(", ")}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
          </Stack>
        </Box>
      </Card>
    </Box>
  );
}
