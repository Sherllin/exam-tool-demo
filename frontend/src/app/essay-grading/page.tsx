"use client";

import { useState } from "react";

import { gradeEssay } from "@/lib/api";
import type { EssayGrade } from "@/lib/types";

const DEMO_ESSAY = `Last weekend I went to the park with my family. We had a picnic under the big tree. I flew a kite with my little brother. The weather was sunny and warm. I was very happy because we spent time together. My mother said the most important thing is not the food but the time with family.`;

const DIMENSION_LABELS: Array<{ key: keyof EssayGrade; label: string; max: number }> = [
  { key: "content", label: "内容", max: 40 },
  { key: "language", label: "语言", max: 30 },
  { key: "structure", label: "结构", max: 15 },
  { key: "vocabulary", label: "词汇", max: 15 },
];


export default function EssayGradingPage() {
  const [text, setText] = useState("");
  const [grade, setGrade] = useState<EssayGrade | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGrade() {
    if (text.trim().length < 20) {
      setError("作文内容太短（至少 20 个字符），请补充后再评分");
      return;
    }
    setGrading(true);
    setError(null);
    try {
      const result = await gradeEssay({ essay_text: text });
      setGrade(result);
    } catch {
      setError("评分请求失败，请确认后端服务已启动");
    } finally {
      setGrading(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>英语作文 AI 阅卷</h1>
          <p>四维评分（内容/语言/结构/词汇）+ 分段校准修正</p>
        </div>
        <span className={`status-tag ${grade?.source === "provider" ? "status-blue" : "status-orange"}`}>
          {grade ? (grade.source === "provider" ? "AI 评分" : "本地演示评分") : "待评分"}
        </span>
      </section>

      <section className="filter-card" aria-label="作文输入">
        <label>
          <span>作文内容（英文）</span>
          <textarea
            className="essay-input"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="粘贴或输入学生英语作文…"
            rows={8}
            maxLength={5000}
          />
        </label>
        <div className="essay-actions">
          <button
            type="button"
            className="secondary-button"
            onClick={() => setText(DEMO_ESSAY)}
          >
            填入示例作文
          </button>
          <button
            type="button"
            className="ai-button"
            onClick={handleGrade}
            disabled={grading || !text.trim()}
          >
            {grading ? "评分中…" : "开始评分"}
          </button>
        </div>
        {error ? <div className="state-card error-state">{error}</div> : null}
      </section>

      {grade ? (
        <section className="essay-result" aria-label="评分结果">
          <div className="essay-score-head">
            <div className="essay-total">
              <span className="essay-total-value">{grade.total}</span>
              <span className="essay-total-label">AI 原始总分</span>
            </div>
            <div className="essay-calibrated">
              <span className="essay-total-value">{grade.calibrated_total}</span>
              <span className="essay-total-label">校准后总分</span>
            </div>
            <div className="essay-level">
              <span className={`status-tag ${grade.level === "优秀" ? "status-green" : grade.level === "较差" ? "status-orange" : "status-blue"}`}>
                {grade.level}
              </span>
              <span className="essay-source-note">{grade.message}</span>
            </div>
          </div>

          <div className="metric-grid">
            {DIMENSION_LABELS.map((dimension) => (
              <div key={dimension.key} className="metric-card">
                <div className="metric-label">{dimension.label}</div>
                <div className="metric-value">
                  {grade[dimension.key]}
                  <span className="metric-meta"> / {dimension.max} 分</span>
                </div>
              </div>
            ))}
          </div>

          <div className="essay-comment">{grade.comment}</div>

          <div className="essay-feedback-grid">
            <div className="check-card">
              <div className="section-title">亮点</div>
              {grade.strengths.length ? (
                grade.strengths.map((item) => (
                  <div key={item} className="check-row">
                    <span className="check-dot green" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="check-row"><span className="check-dot gray" aria-hidden="true" /><span>暂无</span></div>
              )}
            </div>
            <div className="check-card">
              <div className="section-title">问题</div>
              {grade.weaknesses.length ? (
                grade.weaknesses.map((item) => (
                  <div key={item} className="check-row">
                    <span className="check-dot orange" aria-hidden="true" />
                    <span>{item}</span>
                  </div>
                ))
              ) : (
                <div className="check-row"><span className="check-dot gray" aria-hidden="true" /><span>暂无</span></div>
              )}
            </div>
          </div>

          {grade.suggestions ? (
            <div className="check-card">
              <div className="section-title">改进建议</div>
              <div className="essay-suggestion">{grade.suggestions}</div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
