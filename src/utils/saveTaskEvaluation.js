
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const saveTaskEvaluation = async ({
  year,
  quarter,
  teacherId,
  groupAScore,
  groupBScore,
  totalScore,
  classification = "",
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

  const ref = doc(db, "KPI_TASK_EVALUATION", id);

  await setDoc(
    ref,
    {
      year: String(year),
      quarter: String(quarter),
      teacherId: String(teacherId).trim(),
      groupAScore: Number(groupAScore || 0),
      groupBScore: Number(groupBScore || 0),
      totalScore: Number(totalScore || 0),
      classification,
      tasks: tasks.map((task) => ({
        ...task,
        progressPercent: Number(task.progressPercent ?? 100),
        resultPercent: Number(task.resultPercent ?? 100),
        executionScore: Number(task.executionScore ?? 0),
        actualScore: Number(task.actualScore ?? 0),
        exceedsTarget: Boolean(
          task.exceedsTarget ?? task.exceeded
        ),
      })),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
};
