import React, { createContext, useContext, useState, useMemo, useEffect } from "react";

const TaskCatalogContext = createContext(null);

export function TaskCatalogProvider({ children }) {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('global_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  const [headerData, setHeaderData] = useState(null);
  
  const [selfEvaluationCache, setSelfEvaluationCache] = useState({});

  // Khởi tạo taskCatalogCache đọc từ localStorage để không bị mất khi F5
  const [taskCatalogCache, setTaskCatalogCache] = useState(() => {
    const saved = localStorage.getItem('global_task_catalog_cache');
    return saved ? JSON.parse(saved) : {};
  });

  // Tự động lưu taskCatalogCache vào localStorage mỗi khi có thay đổi
  useEffect(() => {
    localStorage.setItem('global_task_catalog_cache', JSON.stringify(taskCatalogCache));
  }, [taskCatalogCache]);

  const value = useMemo(
    () => ({
        tasks,
        setTasks,
        headerData,
        setHeaderData,
        selfEvaluationCache,
        setSelfEvaluationCache,
        taskCatalogCache,
        setTaskCatalogCache,
    }),
    [tasks, headerData, selfEvaluationCache, taskCatalogCache]
  );

  return (
    <TaskCatalogContext.Provider value={value}>
        {children}
    </TaskCatalogContext.Provider>
  );
}

export function useTaskCatalog() {
  const context = useContext(TaskCatalogContext);

  if (!context) {
    throw new Error(
      "useTaskCatalog phải được sử dụng bên trong TaskCatalogProvider"
    );
  }

  return context;
}