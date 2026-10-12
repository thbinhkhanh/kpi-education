import React, { useState, useRef } from "react";
import {
  ClipboardCheck,
  ListTodo,
  ChartNoAxesCombined,
  Save,
  Upload,
  Download,
} from "lucide-react";

import TaskCatalog from "./components/TaskCatalog";
import SelfEvaluation from "./components/SelfEvaluation";
import TaskEvaluation from "./components/TaskEvaluation";
import { TaskCatalogProvider } from "./contexts/TaskCatalogContext";

export default function App() {
  const [activeTab, setActiveTab] = useState("evaluation");
  const [groupBScore, setGroupBScore] = useState(0);
  const [tasks, setTasks] = useState([]);

  // KHAI BÁO STATE DÙNG CHUNG CHO TOÀN BỘ 3 TRANG
  const [globalQuarter, setGlobalQuarter] = useState("3");
  const [globalYear, setGlobalYear] = useState("2026");
  const [globalTeacherName, setGlobalTeacherName] = useState("Phạm Văn Thái");

  // KHAI BÁO ĐẦY ĐỦ CÁC REF CHO 3 TRANG
  const selfEvalRef = useRef(null);
  const taskCatalogRef = useRef(null);
  const taskEvaluationRef = useRef(null);
  const importFileRef = useRef(null);

  const handleImportFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (taskCatalogRef.current?.importExcel) {
      taskCatalogRef.current.importExcel(file);
    } else {
      alert("Trang Danh mục nhiệm vụ chưa hỗ trợ import Excel!");
    }

    event.target.value = "";
  };

  const handleExportFile = () => {
    if (activeTab === "catalog") {
      if (taskCatalogRef.current?.exportExcel) {
        taskCatalogRef.current.exportExcel();
      } else {
        alert("Trang Danh mục nhiệm vụ chưa hỗ trợ export Excel!");
      }
    } else if (activeTab === "taskEvaluation") {
      if (taskEvaluationRef.current?.exportExcel) {
        taskEvaluationRef.current.exportExcel();
      } else {
        alert("Trang Đánh giá kết quả chưa hỗ trợ export Excel!");
      }
    }
  };

  const [taskStats, setTaskStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    exceededTasks: 0,
  });

  const tabs = [
    { id: "evaluation", label: "Bản tự đánh giá", icon: ClipboardCheck },
    { id: "catalog", label: "Danh mục nhiệm vụ", icon: ListTodo },
    { id: "taskEvaluation", label: "Đánh giá kết quả", icon: ChartNoAxesCombined },
  ];

  // HÀM ĐIỀU PHỐI KHI BẤM NÚT LƯU CỐ ĐỊNH Ở ĐẦU TRANG
  const handleGlobalSave = () => {
    if (activeTab === "evaluation") {
      if (selfEvalRef.current && selfEvalRef.current.save) {
        selfEvalRef.current.save();
      }
    } else if (activeTab === "catalog") {
      if (taskCatalogRef.current && taskCatalogRef.current.save) {
        taskCatalogRef.current.save();
      } else {
        alert("Chưa kết nối được với trang Danh mục nhiệm vụ!");
      }
    } else if (activeTab === "taskEvaluation") {
      if (taskEvaluationRef.current && taskEvaluationRef.current.save) {
        taskEvaluationRef.current.save();
      } else {
        alert("Chưa kết nối được với trang Đánh giá kết quả!");
      }
    }
  };

  return (
    <TaskCatalogProvider>
      <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#334155", padding: "12px" }}>
        <main style={{ maxWidth: "1600px", margin: "0 auto" }}>
          
          {/* THANH ĐIỀU HƯỚNG VÀ CÁC NÚT THAO TÁC CỐ ĐỊNH Ở ĐẦU TRANG */}
          <div style={{ 
            position: "sticky", 
            top: "12px", 
            zIndex: 10, 
            display: "flex", 
            justifyContent: "flex-start", 
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
            flexWrap: "wrap"
          }}>
            {/* Nhóm 3 nút chuyển tab */}
            <nav style={{ 
              backgroundColor: "#ffffff", 
              padding: "6px", 
              borderRadius: "12px", 
              border: "1px solid #e2e8f0", 
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "6px",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
              width: "100%",
              maxWidth: "550px"
            }}>
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "none",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                      transition: "all 0.2s",
                      backgroundColor: isActive ? "#2563eb" : "#f1f5f9",
                      color: isActive ? "#ffffff" : "#475569",
                      boxShadow: isActive ? "0 4px 6px -1px rgba(37, 99, 235, 0.2)" : "none"
                    }}
                  >
                    <Icon size={16} strokeWidth={isActive ? 2.4 : 1.8} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* NÚT LƯU TRANG NÀY */}
            <button
              type="button"
              onClick={handleGlobalSave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 18px",
                borderRadius: "12px",
                border: "none",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "13.5px",
                backgroundColor: "#059669",
                color: "#ffffff",
                boxShadow: "0 4px 10px rgba(5, 150, 105, 0.25)",
                transition: "all 0.2s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#047857";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 6px 14px rgba(5, 150, 105, 0.35)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#059669";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 10px rgba(5, 150, 105, 0.25)";
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = "translateY(1px)";
              }}
            >
              <Save size={17} strokeWidth={2.2} />
              <span>Lưu trang này</span>
            </button>

            {/* NÚT UPLOAD & EXPORT FILE EXCEL (HIỆN KHI Ở TAB "CATALOG" HOẶC "TASKEVALUATION") */}
            {(activeTab === "catalog" || activeTab === "taskEvaluation") && (
              <>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  hidden
                  onChange={handleImportFile}
                />

                {activeTab === "catalog" && (
                  <button
                    type="button"
                    onClick={() => importFileRef.current?.click()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 18px",
                      borderRadius: "12px",
                      border: "1px solid #2563eb",
                      cursor: "pointer",
                      fontWeight: 700,
                      fontSize: "13.5px",
                      backgroundColor: "#ffffff",
                      color: "#2563eb",
                      boxShadow: "0 2px 6px rgba(37, 99, 235, 0.1)",
                      transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = "#eff6ff";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "translateY(1px)";
                    }}
                  >
                    <Upload size={17} />
                    <span>Upload file Excel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportFile}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 18px",
                    borderRadius: "12px",
                    border: "1px solid #059669",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: "13.5px",
                    backgroundColor: "#ffffff",
                    color: "#059669",
                    boxShadow: "0 2px 6px rgba(5, 150, 105, 0.1)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#ecfdf5";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  onMouseDown={(e) => {
                    e.currentTarget.style.transform = "translateY(1px)";
                  }}
                >
                  <Download size={17} />
                  <span>Xuất file Excel</span>
                </button>
              </>
            )}
          </div>

          {/* NỘI DUNG TRANG */}
          <section style={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "16px" }}>
            {activeTab === "evaluation" && (
              <SelfEvaluation
                ref={selfEvalRef}
                groupBScore={groupBScore}
                taskStats={taskStats}
                quarter={globalQuarter}
                year={globalYear}
                teacherName={globalTeacherName}
                onQuarterChange={setGlobalQuarter}
                onYearChange={setGlobalYear}
                onTeacherNameChange={setGlobalTeacherName}
                onNavigateCatalog={() => setActiveTab("catalog")}
              />
            )}

            {activeTab === "catalog" && (
              <TaskCatalog
                ref={taskCatalogRef}
                tasks={tasks}
                onTasksChange={setTasks}
                quarter={globalQuarter}
                year={globalYear}
                teacherName={globalTeacherName}
                onQuarterChange={setGlobalQuarter}
                onYearChange={setGlobalYear}
                onTeacherNameChange={setGlobalTeacherName}
              />
            )}

            {activeTab === "taskEvaluation" && (
              <TaskEvaluation
                ref={taskEvaluationRef}
                tasks={tasks}
                onTasksChange={setTasks}
                onKpiChange={setGroupBScore}
                onTaskStatsChange={setTaskStats}
                quarter={globalQuarter}
                year={globalYear}
                teacherName={globalTeacherName}
                onQuarterChange={setGlobalQuarter}
                onYearChange={setGlobalYear}
                onTeacherNameChange={setGlobalTeacherName}
              />
            )}
          </section>
        </main>
      </div>
    </TaskCatalogProvider>
  );
}