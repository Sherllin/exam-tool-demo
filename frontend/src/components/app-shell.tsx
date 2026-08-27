"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";


const navigation = [
  { href: "/", label: "成绩发布" },
  { href: "/print", label: "打印配置" },
  { href: "/comparison", label: "班级对比" },
  { href: "/essay-grading", label: "作文阅卷" },
];


function breadcrumb(pathname: string): string {
  if (pathname === "/print") return "考试管理  >  成绩打印配置";
  if (pathname === "/comparison") return "考试管理  >  班级平均分对比";
  if (pathname === "/essay-grading") return "考试管理  >  英语作文 AI 阅卷";
  return "考试管理  >  成绩发布总览";
}


export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar no-print" aria-label="主导航">
        <div className="brand">智阅考试工具</div>
        <div className="nav-section">考试运营</div>
        <nav className="nav-list">
          {navigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="nav-dot" aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-footer">帮助与反馈</div>
      </aside>

      <div className="main-area">
        <header className="topbar no-print">
          <div>{breadcrumb(pathname)}</div>
          <div className="avatar" aria-label="当前用户王老师">
            王
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
