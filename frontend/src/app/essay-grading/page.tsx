"use client";

import { useMemo, useRef, useState } from "react";

import { gradeEssay, gradeEssayBatch } from "@/lib/api";
import type { BatchEssayItem, BatchGradeResponse, EssayGrade } from "@/lib/types";

const DEMO_ESSAY = `Last weekend I went to the park with my family. We had a picnic under the big tree. I flew a kite with my little brother. The weather was sunny and warm. I was very happy because we spent time together. My mother said the most important thing is not the food but the time with family.`;

const DEMO_BATCH = `1001,张伟,Last weekend I went to the park with my family. We had a picnic under the big tree. I flew a kite with my little brother.
1002,李娜,Online learning is very popular now. We can study at home. But sometimes I feel boring because I can't see my classmates. I think we should use computer carefully.
1003,王强,Last year I go to park with my family. We have picnic. I eat too much food. Then I feel very sick. My mother is very worry. She take me to hospital.`;

const DIMENSION_LABELS: Array<{ key: keyof EssayGrade; label: string; max: number }> = [
  { key: "content", label: "内容", max: 40 },
  { key: "language", label: "语言", max: 30 },
  { key: "structure", label: "结构", max: 15 },
  { key: "vocabulary", label: "词汇", max: 15 },
];

type TabKey = "single" | "batch";

interface ParsedBatch {
  items: BatchEssayItem[];
  errors: string[];
}

function levelClass(level: string): string {
  if (level === "优秀") return "status-green";
  if (level === "良好") return "status-blue";
  if (level === "中等") return "status-blue";
  if (level === "较差") return "status-orange";
  return "status-gray";
}

/** 把批量文本解析为学生条目：支持英/中文逗号、Tab、竖线分隔，作文为最后一个字段。 */
function parseBatchText(text: string): ParsedBatch {
  const items: BatchEssayItem[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith("#")) continue;
    // 优先英文逗号，其次 Tab，再次竖线，最后中文逗号
    let parts = line.split(/[,]/).map((part) => part.trim());
    if (parts.length < 2) parts = line.split(/\t/).map((part) => part.trim());
    if (parts.length < 2) parts = line.split(/[|]/).map((part) => part.trim());
    if (parts.length < 2) parts = line.split(/[，]/).map((part) => part.trim());

    let student_no: string;
    let name: string;
    let essay: string;
    if (parts.length >= 3) {
      student_no = parts[0];
      name = parts[1];
      essay = parts.slice(2).join(", "); // 作文内可能含逗号，合并剩余
    } else if (parts.length === 2) {
      student_no = `S${index + 1}`;
      name = parts[0];
      essay = parts[1];
    } else {
      student_no = `S${index + 1}`;
      name = `学生${index + 1}`;
      essay = parts[0];
    }
    if (essay.trim().length < 20) {
      errors.push(`第 ${index + 1} 行作文内容过短（不足 20 字符）：${name}`);
      continue;
    }
    items.push({ student_no, name, essay_text: essay.trim() });
  }
  return { items, errors };
}

/** 将结果导出为 CSV 文件（含表头）。 */
function exportCsv(result: BatchGradeResponse) {
  const header = ["学号", "姓名", "原始总分", "校准总分", "内容", "语言", "结构", "词汇", "等级", "评语"];
  const escape = (value: string | number) => {
    const text = String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const rows = result.items.map((item) =>
    [
      item.student_no,
      item.name,
      item.grade.total,
      item.grade.calibrated_total,
      item.grade.content,
      item.grade.language,
      item.grade.structure,
      item.grade.vocabulary,
      item.grade.level,
      item.grade.comment,
    ]
      .map(escape)
      .join(","),
  );
  const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `作文评分结果_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}


export default function EssayGradingPage() {
  const [tab, setTab] = useState<TabKey>("single");
  const [prompt, setPrompt] = useState("");
  const [rubric, setRubric] = useState("");
  const [configOpen, setConfigOpen] = useState(false);

  // 单篇测试
  const [text, setText] = useState("");
  const [grade, setGrade] = useState<EssayGrade | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 批量阅卷
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [batchResult, setBatchResult] = useState<BatchGradeResponse | null>(null);
  const [batchGrading, setBatchGrading] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseBatchText(rawText), [rawText]);

  function handleFile(file: File) {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? "");
      setRawText(content);
      setBatchError(null);
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleSingleGrade() {
    if (text.trim().length < 20) {
      setError("作文内容太短（至少 20 个字符），请补充后再评分");
      return;
    }
    setGrading(true);
    setError(null);
    try {
      const result = await gradeEssay({
        essay_text: text,
        prompt: prompt.trim() || undefined,
        rubric: rubric.trim() || undefined,
      });
      setGrade(result);
    } catch {
      setError("评分请求失败，请确认后端服务已启动");
    } finally {
      setGrading(false);
    }
  }

  async function handleBatchGrade() {
    if (!parsed.items.length) {
      setBatchError("未解析到有效学生作答数据，请检查粘贴内容或上传文件");
      return;
    }
    setBatchGrading(true);
    setBatchError(null);
    try {
      const result = await gradeEssayBatch({
        prompt: prompt.trim() || undefined,
        rubric: rubric.trim() || undefined,
        essays: parsed.items,
      });
      setBatchResult(result);
    } catch {
      setBatchError("批量评分请求失败，请确认后端服务已启动");
    } finally {
      setBatchGrading(false);
    }
  }

  const stats = batchResult?.stats;
  const levelOrder = ["优秀", "良好", "中等", "较差"];

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <h1>英语作文 AI 阅卷</h1>
          <p>支持单篇测试与批量阅卷 · 可附带题目与评分标准 · 四维评分 + 分段校准</p>
        </div>
        <span className={`status-tag ${batchResult?.source === "provider" ? "status-blue" : batchResult?.source === "mixed" ? "status-green" : "status-orange"}`}>
          {batchResult
            ? batchResult.message
            : grade
              ? grade.source === "provider"
                ? "AI 评分"
                : "本地演示评分"
              : "待评分"}
        </span>
      </section>

      {/* 公共配置：题目 + 评分标准 */}
      <section className="filter-card essay-config" aria-label="阅卷配置">
        <button
          type="button"
          className="config-toggle"
          onClick={() => setConfigOpen((open) => !open)}
        >
          <span>{configOpen ? "收起" : "展开"}题目与评分标准</span>
          <span className={`config-caret${configOpen ? " open" : ""}`} aria-hidden="true">▾</span>
        </button>
        {configOpen ? (
          <div className="config-fields">
            <label>
              <span>作文题目（可选）</span>
              <textarea
                className="essay-input config-textarea"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="例如：请以“My Favorite Season”为题写一篇英语短文，词数 80-120…"
                rows={2}
                maxLength={2000}
              />
            </label>
            <label>
              <span>评分标准（可选）</span>
              <textarea
                className="essay-input config-textarea"
                value={rubric}
                onChange={(event) => setRubric(event.target.value)}
                placeholder="粘贴本次考试评分标准；为空则使用默认四维评分量表（内容40/语言30/结构15/词汇15）"
                rows={3}
                maxLength={4000}
              />
            </label>
          </div>
        ) : null}
      </section>

      {/* 模式切换 */}
      <div className="grading-tabs" role="tablist" aria-label="阅卷模式">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "single"}
          className={`grading-tab${tab === "single" ? " active" : ""}`}
          onClick={() => setTab("single")}
        >
          单篇测试
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "batch"}
          className={`grading-tab${tab === "batch" ? " active" : ""}`}
          onClick={() => setTab("batch")}
        >
          批量阅卷
        </button>
      </div>

      {tab === "single" ? (
        <section className="filter-card" aria-label="单篇作文测试">
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
            <button type="button" className="secondary-button" onClick={() => setText(DEMO_ESSAY)}>
              填入示例作文
            </button>
            <button
              type="button"
              className="ai-button"
              onClick={handleSingleGrade}
              disabled={grading || !text.trim()}
            >
              {grading ? "评分中…" : "开始评分"}
            </button>
          </div>
          {error ? <div className="state-card error-state">{error}</div> : null}

          {grade ? (
            <div className="essay-result">
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
                  <span className={`status-tag ${levelClass(grade.level)}`}>{grade.level}</span>
                  <span className="essay-source-note">{grade.message}</span>
                </div>
              </div>
              <div className="metric-grid essay-metric-grid">
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
            </div>
          ) : null}
        </section>
      ) : (
        <section className="filter-card batch-card" aria-label="批量阅卷">
          <label>
            <span>批量学生作答数据（每行一条，格式：学号,姓名,英文作文）</span>
            <textarea
              className="essay-input batch-input"
              value={rawText}
              onChange={(event) => {
                setRawText(event.target.value);
                setBatchError(null);
              }}
              placeholder={DEMO_BATCH}
              rows={10}
            />
          </label>
          <div className="batch-toolbar">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setRawText(DEMO_BATCH)}
            >
              填入示例数据
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? `已选择：${fileName}` : "上传 .txt / .csv 文件"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              style={{ display: "none" }}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              className="ai-button"
              onClick={handleBatchGrade}
              disabled={batchGrading || !parsed.items.length}
            >
              {batchGrading ? `批量评分中…（${parsed.items.length} 篇）` : `开始批量评分（${parsed.items.length} 篇）`}
            </button>
          </div>

          {parsed.items.length ? (
            <div className="batch-preview">
              <span className="batch-preview-count">✓ 已识别 {parsed.items.length} 篇学生作答</span>
              <ul>
                {parsed.items.slice(0, 3).map((item) => (
                  <li key={item.student_no}>
                    {item.student_no} · {item.name} · {item.essay_text.slice(0, 40)}…
                  </li>
                ))}
              </ul>
              {parsed.items.length > 3 ? <span className="batch-preview-more">…共 {parsed.items.length} 篇</span> : null}
            </div>
          ) : null}
          {parsed.errors.length ? (
            <div className="batch-errors">
              {parsed.errors.slice(0, 5).map((err) => (
                <div key={err} className="batch-error-row">⚠ {err}</div>
              ))}
            </div>
          ) : null}
          {batchError ? <div className="state-card error-state">{batchError}</div> : null}

          {batchResult && stats ? (
            <div className="batch-result">
              <div className="summary-grid">
                <div className="summary-card">
                  <div className="summary-value">{stats.count}</div>
                  <div className="summary-label">参与评分</div>
                </div>
                <div className="summary-card highlight">
                  <div className="summary-value">{stats.avg_calibrated}</div>
                  <div className="summary-label">平均校准分</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{stats.max_total}</div>
                  <div className="summary-label">最高分</div>
                </div>
                <div className="summary-card">
                  <div className="summary-value">{stats.min_total}</div>
                  <div className="summary-label">最低分</div>
                </div>
                <div className="summary-card level-summary">
                  {levelOrder.map((level) =>
                    stats.level_distribution[level] ? (
                      <div key={level} className="level-dist-row">
                        <span className={`status-tag ${levelClass(level)}`}>{level}</span>
                        <span className="level-dist-count">{stats.level_distribution[level]} 人</span>
                      </div>
                    ) : null,
                  )}
                </div>
              </div>

              <div className="batch-table-actions">
                <button type="button" className="secondary-button" onClick={() => exportCsv(batchResult)}>
                  导出 CSV
                </button>
              </div>

              <div className="table-scroll">
                <table className="data-table batch-table">
                  <thead>
                    <tr>
                      <th>学号</th>
                      <th>姓名</th>
                      <th>总分</th>
                      <th>校准分</th>
                      <th>内容</th>
                      <th>语言</th>
                      <th>结构</th>
                      <th>词汇</th>
                      <th>等级</th>
                      <th>评语</th>
                      <th aria-label="详情" />
                    </tr>
                  </thead>
                  <tbody>
                    {batchResult.items.map((item) => {
                      const open = expandedRow === item.student_no;
                      return (
                        <tr key={item.student_no}>
                          <td>{item.student_no}</td>
                          <td>{item.name}</td>
                          <td className="score-cell">{item.grade.total}</td>
                          <td className="score-cell total-score">{item.grade.calibrated_total}</td>
                          <td className="score-cell">{item.grade.content}</td>
                          <td className="score-cell">{item.grade.language}</td>
                          <td className="score-cell">{item.grade.structure}</td>
                          <td className="score-cell">{item.grade.vocabulary}</td>
                          <td><span className={`status-tag ${levelClass(item.grade.level)}`}>{item.grade.level}</span></td>
                          <td className="batch-comment-cell">{item.grade.comment}</td>
                          <td>
                            <button
                              type="button"
                              className="text-button row-toggle"
                              onClick={() => setExpandedRow(open ? null : item.student_no)}
                            >
                              {open ? "收起" : "详情"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
