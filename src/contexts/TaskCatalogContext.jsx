import React, { createContext, useContext, useState, useMemo } from "react";

const TaskCatalogContext = createContext(null);

export function TaskCatalogProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [headerData, setHeaderData] = useState(null);
  const [selfEvaluationCache, setSelfEvaluationCache] = useState({});
  const [taskCatalogCache, setTaskCatalogCache] = useState({});

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
