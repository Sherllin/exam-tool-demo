"use client";

import { useEffect, useState } from "react";

import { Dashboard } from "@/components/dashboard";
import { getDashboard } from "@/lib/api";
import type { DashboardData } from "@/lib/types";


export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDashboard().then(setData).catch(() => setError("总览加载失败，请确认后端服务已启动"));
  }, []);

  if (error) return <div className="state-card error-state">{error}</div>;
  if (!data) return <div className="state-card">正在加载成绩总览…</div>;
  return <Dashboard data={data} />;
}
