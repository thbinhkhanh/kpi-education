import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const saveTaskCatalog = async ({
  year,
  quarter,
  teacherId,
  tasks,
}) => {
  if (!year || !quarter || !teacherId) {
    throw new Error("Thiếu năm, quý hoặc họ tên giáo viên.");
  }

  if (!Array.isArray(tasks)) {
    throw new Error("Danh sách nhiệm vụ không hợp lệ.");
  }

  const id = `${String(year)}_Q${String(quarter)}_${String(
    teacherId
  ).trim()}`;

  const ref = doc(db, "KPI_TASK_CATALOG", id);

  await setDoc(
    ref,
    {
      year: String(year),
      quarter: String(quarter),
      teacherId: String(teacherId).trim(),
      tasks,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
};