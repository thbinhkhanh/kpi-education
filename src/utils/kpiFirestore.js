import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

// Tạo ID hồ sơ dùng chung cho cả 3 trang
const getKpiDocId = ({ year, quarter, teacherId }) => {
  if (!year || !quarter || !teacherId) {
    throw new Error("Vui lòng nhập năm, quý và mã giáo viên.");
  }

  return `${year}_Q${quarter}_${String(teacherId).trim()}`;
};

// Đọc hồ sơ đánh giá từ Firestore
export const getEvaluation = async ({ year, quarter, teacherId }) => {
  const id = getKpiDocId({ year, quarter, teacherId });
  const snapshot = await getDoc(doc(db, "KPI_EVALUATIONS", id));

  return snapshot.exists() ? snapshot.data() : null;
};

// Đọc danh mục nhóm tiêu chí từ Firestore
export const getCriteriaGroups = async () => {
  const snapshot = await getDoc(doc(db, "KPI_CRITERIA", "groups"));

  if (!snapshot.exists()) {
    throw new Error(
      'Không tìm thấy tài liệu KPI_CRITERIA/groups trong Firestore.'
    );
  }

  const data = snapshot.data();

  if (!Array.isArray(data.criteriaGroups)) {
    throw new Error(
      'Trường "criteriaGroups" trong Firestore phải là một mảng.'
    );
  }

  return data.criteriaGroups;
};

// Lưu danh mục nhóm tiêu chí vào Firestore
export const saveCriteriaGroups = async (criteriaGroups) => {
  if (!Array.isArray(criteriaGroups)) {
    throw new Error("Danh mục tiêu chí phải là một mảng.");
  }

  await setDoc(
    doc(db, "KPI_CRITERIA", "groups"),
    {
      criteriaGroups,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

// 1. Lưu thông tin cá nhân và thông tin kỳ đánh giá
export const saveHeader = async ({
  year,
  quarter,
  teacherId,
  personalInfo,
  date,
  organization,
}) => {
  const id = getKpiDocId({ year, quarter, teacherId });

  await setDoc(
    doc(db, "KPI_EVALUATIONS", id),
    {
      year: String(year),
      quarter: String(quarter),
      teacherId: String(teacherId).trim(),
      personalInfo,
      date,
      organization,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return id;
};

// 2. Lưu danh mục nhiệm vụ
export const saveTaskCatalog = async ({
  year,
  quarter,
  teacherId,
  tasks,
}) => {
  const id = getKpiDocId({ year, quarter, teacherId });

  await setDoc(
    doc(db, "KPI_EVALUATIONS", id),
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

// 3. Lưu kết quả thực hiện và tự đánh giá
export const saveEvaluation = async ({
  year,
  quarter,
  teacherId,
  selfEvaluation,
  groupAScore,
  groupBScore,
  totalScore,
  classification,
  tasks,
}) => {
  const id = getKpiDocId({ year, quarter, teacherId });

  const data = {
    year: String(year),
    quarter: String(quarter),
    teacherId: String(teacherId).trim(),
    groupAScore,
    groupBScore,
    totalScore,
    classification,
    updatedAt: serverTimestamp(),
  };

  if (selfEvaluation !== undefined) {
    data.selfEvaluation = selfEvaluation;
  }

  if (tasks !== undefined) {
    data.tasks = tasks;
  }

  await setDoc(
    doc(db, "KPI_EVALUATIONS", id),
    data,
    { merge: true }
  );

  return id;
};