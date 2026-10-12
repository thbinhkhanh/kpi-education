// Chỉ lưu dữ liệu của trang SelfEvaluation.jsx
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { db } from '../firebase';

const getKpiDocId = ({ year, quarter, teacherId }) => {
  if (!year || !quarter || !teacherId) {
    throw new Error('Thiếu năm, quý hoặc họ tên giáo viên.');
  }

  return `${year}_Q${quarter}_${String(teacherId).trim()}`;
};

export const saveSelfEvaluation = async ({
  year,
  quarter,
  teacherId,
  criteriaGroups,
  selfEvaluation,
  groupAScore,
  groupBScore,
  totalScore,
  classification,
  taskStats,
}) => {
  const id = getKpiDocId({ year, quarter, teacherId });

  await setDoc(
    doc(db, "KPI_EVALUATIONS", id),
    {
      year: String(year),
      quarter: String(quarter),
      teacherId: String(teacherId).trim(),
      criteriaGroups,
      selfEvaluation,
      groupAScore,
      groupBScore,
      totalScore,
      classification,
      taskStats,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
};

// Lấy dữ liệu đã lưu của trang SelfEvaluation.jsx
export const getSelfEvaluation = async ({ year, quarter, teacherId }) => {
  const id = getKpiDocId({ year, quarter, teacherId });

  const snapshot = await getDoc(doc(db, "KPI_EVALUATIONS", id));

  if (!snapshot.exists()) return null;

  const data = snapshot.data();

  return {
    criteriaGroups: data.criteriaGroups ?? [],
    selfEvaluation: data.selfEvaluation ?? {},
    groupAScore: data.groupAScore ?? 0,
    groupBScore: data.groupBScore ?? 0,
    totalScore: data.totalScore ?? 0,
    classification: data.classification ?? "",
    taskStats: data.taskStats ?? {},
  };
};