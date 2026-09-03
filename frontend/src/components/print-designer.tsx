"use client";

import { useMemo, useState } from "react";

import { requestTitleSuggestion } from "@/lib/api";
import {
  moveField,
  toConfigurableFields,
  toggleField,
} from "@/lib/print-config";
import type {
  ConfigurableField,
  PrintData,
  StudentScore,
  TitleSuggestion,
  TitleSuggestionRequest,
} from "@/lib/types";


type SuggestTitle = (request: TitleSuggestionRequest) => Promise<TitleSuggestion>;


function scoreValue(student: StudentScore, fieldId: string): string | number {
  const value = student[fieldId as keyof StudentScore];
  return value ?? "—";
}

/** 150 分制下低于 90 分（不及格）的成绩以朱砂红标出，模拟阅卷批注。 */
function scoreClass(fieldId: string, value: string | number): string {
  if (typeof value !== "number") return "";
  if (fieldId === "total") return value < 270 ? "score-low" : "";
  return value < 90 ? "score-low" : "";
}


export function PrintDesigner({
  data,
  suggestTitle = requestTitleSuggestion,
}: {
  data: PrintData;
  suggestTitle?: SuggestTitle;
}) {
  const defaults = useMemo(() => toConfigurableFields(data.fields), [data.fields]);
  const [draftTitle, setDraftTitle] = useState(data.default_title);
  const [draftFields, setDraftFields] = useState<ConfigurableField[]>(defaults);
  const [appliedTitle, setAppliedTitle] = useState(data.default_title);
  const [appliedFields, setAppliedFields] = useState<ConfigurableField[]>(defaults);
  const [suggestion, setSuggestion] = useState<TitleSuggestion | null>(null);
  const [suggesting, setSuggesting] = useState(false);

  const visibleFields = appliedFields.filter((field) => field.visible);
  const classNames = Array.from(new Set(data.students.map((s) => s.class_name)));
  const classLabel =
    classNames.length === 1 ? classNames[0] : `${classNames.length} 个班级`;

  async function handleSuggestTitle() {
    setSuggesting(true);
    try {
      const result = await suggestTitle({
        exam_name: data.exam.name,
        grade: data.exam.grade,
        document_type: "班级成绩单",
      });
      setDraftTitle(result.title);
      setSuggestion(result);
    } catch {
      setSuggestion({
        title: draftTitle,
        source: "fallback",
        message: "标题建议请求失败，请稍后重试",
      });
    } finally {
      setSuggesting(false);
    }
  }

  function applyDraft() {
    setAppliedTitle(draftTitle.trim() || data.default_title);
    setAppliedFields(draftFields.map((field) => ({ ...field })));
  }

  function resetDraft() {
    setDraftTitle(data.default_title);
    setDraftFields(defaults.map((field) => ({ ...field })));
    setSuggestion(null);
  }

  return (
    <div className="print-layout">
      <section className="config-panel no-print" aria-label="打印配置">
        <div className="panel-heading">
          <div>
            <h2>打印配置</h2>
            <p>仅作用于当前考试和当前页面会话</p>
          </div>
          <span className="status-tag status-orange">待样例复核</span>
        </div>

        <label className="field-label" htmlFor="print-title">基础标题</label>
        <div className="title-row">
          <input
            id="print-title"
            aria-label="基础标题"
            value={draftTitle}
            maxLength={60}
            onChange={(event) => setDraftTitle(event.target.value)}
          />
          <button
            type="button"
            className="ai-button"
            onClick={handleSuggestTitle}
            disabled={suggesting}
          >
            {suggesting ? "生成中…" : "AI 生成标题建议"}
          </button>
        </div>
        {suggestion ? (
          <div className={`suggestion-note ${suggestion.source}`} role="status">
            <span>{suggestion.source === "provider" ? "LLM" : "演示回退"}</span>
            {suggestion.message}
          </div>
        ) : null}

        <div className="field-list-heading">
          <div>
            <h3>展示字段与顺序</h3>
            <p>字段清单为 Demo 方案，待真实样例确认</p>
          </div>
        </div>
        <div className="field-list">
          {draftFields.map((field, index) => (
            <div className="field-row" key={field.id}>
              <label>
                <input
                  type="checkbox"
                  checked={field.visible}
                  onChange={() => setDraftFields(toggleField(draftFields, field.id))}
                />
                <span>{field.label}</span>
              </label>
              <span className={`field-kind ${field.kind}`}>{field.kind === "score" ? "成绩" : "文本"}</span>
              <div className="order-buttons">
                <button
                  type="button"
                  aria-label={`${field.label}上移`}
                  disabled={index === 0}
                  onClick={() => setDraftFields(moveField(draftFields, field.id, "up"))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`${field.label}下移`}
                  disabled={index === draftFields.length - 1}
                  onClick={() => setDraftFields(moveField(draftFields, field.id, "down"))}
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="config-actions">
          <button type="button" className="secondary-button" onClick={resetDraft}>
            恢复默认
          </button>
          <button type="button" className="primary-button" onClick={applyDraft}>
            应用到预览
          </button>
        </div>
      </section>

      <section className="preview-column">
        <div className="preview-toolbar no-print">
          <div>
            <h2>打印结果预览</h2>
            <p>配置不会改变任何成绩数值或学生归属</p>
          </div>
          <button type="button" className="primary-button" onClick={() => window.print()}>
            打印当前预览
          </button>
        </div>

        <article className="print-preview" data-testid="print-preview">
          <div className="print-title-block">
            <h2>{appliedTitle}</h2>
            <p>
              {data.exam.grade} · {classLabel}
              {data.exam.exam_date ? ` · 考试日期 ${data.exam.exam_date}` : ""}
            </p>
          </div>
          <div className="table-scroll">
            <table className="data-table score-table">
              <thead>
                <tr>
                  {visibleFields.map((field) => (
                    <th scope="col" key={field.id}>{field.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.students.map((student) => (
                  <tr key={student.student_no}>
                    {visibleFields.map((field) => (
                      <td
                        key={field.id}
                        className={`${scoreClass(field.id, scoreValue(student, field.id))}${field.id === "total" ? " total-score" : ""}${field.kind === "score" ? " score-cell" : ""}`}
                      >
                        {scoreValue(student, field.id)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="print-footer">
            <span>{data.sample_notice}</span>
            <span className="print-seal" aria-hidden="true">成绩专用章</span>
          </div>
        </article>
      </section>
    </div>
  );
}
