
import React from 'react';
import { Award, User, Sparkles } from 'lucide-react';

export default function TeacherPerformance() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 text-white shadow-lg">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
        {/* Thông tin hệ thống */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner">
            <Award className="h-7 w-7 text-amber-300" />
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-sky-300" />

              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                Teacher Performance
              </span>
            </div>

            <h1 className="m-0 text-base font-bold leading-snug text-white sm:text-lg">
              HỆ THỐNG ĐÁNH GIÁ, XẾP LOẠI KPI GIÁO VIÊN
            </h1>

            <p className="mt-1 text-xs leading-relaxed text-blue-200 sm:text-sm">
              Trường Tiểu học Bình Khánh · Cần Giờ · TP. Hồ Chí Minh
            </p>
          </div>
        </div>

        {/* Tài khoản giáo viên */}
        <div className="flex items-center gap-3 self-start rounded-xl border border-white/15 bg-white/10 px-3 py-2 sm:self-center">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-400/20">
            <User className="h-5 w-5 text-sky-200" />
          </div>

          <div>
            <p className="m-0 text-xs text-blue-200">
              Tài khoản giáo viên
            </p>

            <p className="m-0 mt-0.5 text-sm font-semibold text-white">
              Phạm Văn Thái
            </p>

            <p className="m-0 text-xs text-blue-200">
              Tổ trưởng chuyên môn
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
