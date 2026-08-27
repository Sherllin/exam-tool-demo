"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { PrintDesigner } from "@/components/print-designer";
import { getPrintData } from "@/lib/api";
import type { PrintData } from "@/lib/types";


export default function PrintPage() {
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPrintData("exam-2026-09")
      .then(setData)
      .catch(() => setError("打印数据加载失败，请确认后端服务已启动"));
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading no-print">
        <div>
          <h1>成绩打印配置</h1>
          <p>当前考试的一份轻量配置，不保存为多模板</p>
        </div>
        <Link className="text-button" href="/">返回成绩发布</Link>
      </section>
      {error ? <div className="state-card error-state">{error}</div> : null}
      {!error && !data ? <div className="state-card">正在加载打印数据…</div> : null}
      {data ? <PrintDesigner data={data} /> : null}
    </div>
  );
}
