import Link from "next/link";

import type { DashboardData } from "@/lib/types";


export function Dashboard({ data }: { data: DashboardData }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>成绩发布</h1>
          <p>
            模拟考试 · {data.exam.name}
            {data.exam.exam_date ? (
              <span className="exam-date-chip"> · {data.exam.exam_date}</span>
            ) : null}
          </p>
        </div>
        <span className="status-tag status-blue">{data.data_status}</span>
      </section>

      <div className="scope-banner" role="note">
        <span className="info-mark" aria-hidden="true">i</span>
        <span>{data.scope_notice}</span>
      </div>

      <section className="metric-grid" aria-label="本期功能概览">
        <article className="metric-card metric-featured">
          <span className="seal-stamp seal-stamp-in" aria-hidden="true">已就绪</span>
          <div>
            <div className="metric-label">成绩数据状态</div>
            <div className="metric-meta">
              {data.class_count} 个班级 · {data.candidate_count} 名考生
            </div>
          </div>
        </article>

        <article className="metric-card action-card">
          <div className="metric-label">成绩打印配置</div>
          <div className="metric-feature">字段显隐 · 顺序 · 标题</div>
          <div className="metric-meta">作用于当前考试的打印结果</div>
          <Link className="secondary-button" href="/print">
            配置打印结果
          </Link>
        </article>

        <article className="metric-card action-card">
          <div className="metric-label">班级平均分对比</div>
          <div className="metric-value">{data.class_count}</div>
          <div className="metric-meta">同考试 · 同年级 · 基础表格</div>
          <Link className="secondary-button" href="/comparison">
            查看班级对比
          </Link>
        </article>

        <article className="metric-card action-card">
          <div className="metric-label">英语作文 AI 阅卷</div>
          <div className="metric-feature">四维评分 · 分段校准</div>
          <div className="metric-meta">单篇测试与批量阅卷，已接入 LLM</div>
          <Link className="secondary-button" href="/essay-grading">
            体验 AI 阅卷
          </Link>
        </article>
      </section>

      <section>
        <h2 className="section-title">本期范围检查</h2>
        <div className="check-card">
          <div className="check-row">
            <span className="check-dot green" aria-hidden="true" />
            <strong>打印最小配置</strong>
            <span>支持字段显隐、字段顺序和基础标题</span>
            <span className="status-tag status-green">本期实现</span>
          </div>
          <div className="check-row">
            <span className="check-dot blue" aria-hidden="true" />
            <strong>班级平均分</strong>
            <span>总分及各科平均分按班级分行展示</span>
            <span className="status-tag status-blue">本期实现</span>
          </div>
          <div className="check-row">
            <span className="check-dot green" aria-hidden="true" />
            <strong>英语作文 AI</strong>
            <span>四维评分 + 分段校准，已接入真实 LLM 接口</span>
            <span className="status-tag status-green">本期实现</span>
          </div>
          <div className="check-row">
            <span className="check-dot orange" aria-hidden="true" />
            <strong>真实样例与统计口径</strong>
            <span>字段、版式和缺考规则仍需业务最终确认</span>
            <span className="status-tag status-orange">待确认</span>
          </div>
        </div>
      </section>
    </div>
  );
}
