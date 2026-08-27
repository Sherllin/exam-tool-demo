"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AverageTable } from "@/components/average-table";
import { getClassAverages } from "@/lib/api";
import type { ClassAverageData } from "@/lib/types";


export default function ComparisonPage() {
  const [data, setData] = useState<ClassAverageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getClassAverages("exam-2026-09", "高二")
      .then(setData)
      .catch(() => setError("平均分数据加载失败，请确认后端服务已启动"));
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>班级平均分对比</h1>
          <p>同一次考试、同一年级的多个班级基础表格</p>
        </div>
        <Link className="text-button" href="/">返回成绩发布</Link>
      </section>

      <section className="filter-card" aria-label="当前对比范围">
        <label>
          <span>考试批次</span>
          <input value={data?.exam_name ?? "高二年级第一次月考"} readOnly />
        </label>
        <label>
          <span>年级范围</span>
          <input value={data?.grade ?? "高二"} readOnly />
        </label>
        <div className="scope-lock">
          <span className="status-tag status-blue">范围已限定</span>
          不跨考试、不跨年级
        </div>
      </section>

      {error ? <div className="state-card error-state">{error}</div> : null}
      {!error && !data ? <div className="state-card">正在加载班级平均分…</div> : null}
      {data ? <AverageTable data={data} /> : null}
    </div>
  );
}
