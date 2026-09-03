import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell";

import "./globals.css";


export const metadata: Metadata = {
  title: "智阅考试工具 · 成绩发布与 AI 阅卷演示",
  description:
    "成绩发布总览、打印轻量配置、班级平均分对比与英语作文 AI 阅卷演示系统（数据为仿真模拟）。",
};


export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
