# 考试工具 Demo API 接口文档

## 基本信息

- API 版本：`0.1.0`
- 本地开发地址：`http://127.0.0.1:8000`
- Docker 内部地址：`http://backend:8000`
- 公网演示入口：`http://36.151.143.201:3002/api`
- 数据格式：`application/json`
- 当前演示考试 ID：`exam-2026-09`

前端通过 Next.js 将 `/api/*` 请求转发给 FastAPI。Docker 部署时 FastAPI 不直接暴露宿主机端口。

## 接口清单

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 服务健康检查 |
| GET | `/api/dashboard` | 获取成绩发布总览 |
| GET | `/api/exams/{exam_id}/print-data` | 获取成绩单打印数据与字段配置 |
| GET | `/api/exams/{exam_id}/class-averages` | 获取指定年级的班级平均分 |
| POST | `/api/llm/title-suggestion` | 生成可编辑的成绩单标题建议 |
| POST | `/api/essay/grade` | 英语作文 AI 阅卷：四维评分 + 分段校准 |

## GET `/api/health`

响应示例：

```json
{
  "status": "ok",
  "service": "exam-tool-demo"
}
```

## GET `/api/dashboard`

返回当前考试摘要、班级数量、考生数量、数据状态与演示范围说明。

## GET `/api/exams/{exam_id}/print-data`

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `exam_id` | path | string | 是 | Demo 使用 `exam-2026-09` |

响应包含考试信息、默认标题、可配置打印字段、脱敏学生成绩以及样例说明。考试不存在时返回 `404`。

## GET `/api/exams/{exam_id}/class-averages`

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `exam_id` | path | string | 是 | 考试 ID |
| `grade` | query | string | 是 | Demo 使用 `高二` |

请求示例：

```http
GET /api/exams/exam-2026-09/class-averages?grade=高二
```

响应包含考试、年级、学科列表、各班人数、总分平均分、分科平均分及统计口径说明。考试或年级不存在时返回 `404`，参数校验失败时返回 `422`。

## POST `/api/llm/title-suggestion`

请求体：

```json
{
  "exam_name": "高二年级第一次月考",
  "grade": "高二",
  "document_type": "班级成绩单"
}
```

| 字段 | 类型 | 必填 | 长度 |
| --- | --- | --- | --- |
| `exam_name` | string | 是 | 1～80 |
| `grade` | string | 是 | 1～30 |
| `document_type` | string | 是 | 1～30 |

响应示例：

```json
{
  "title": "高二年级第一次月考班级成绩单",
  "source": "fallback",
  "message": "未配置 LLM，当前为本地演示建议"
}
```

`source` 为 `provider` 时表示结果来自模型服务；为 `fallback` 时表示未配置模型或调用失败。模型服务需兼容 Chat Completions，通过 `LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 和 `LLM_TIMEOUT_SECONDS` 配置。

## POST `/api/essay/grade`

英语作文 AI 阅卷：按四个维度（内容 40 / 语言 30 / 结构 15 / 词汇 15，总分 100）评分，并对 AI 原始总分应用 3 段分段校准修正（与独立评测同源系数，测试集 MAE 6.1）。

请求体：

```json
{
  "essay_text": "Last weekend I went to the park with my family..."
}
```

| 字段 | 类型 | 必填 | 长度 |
| --- | --- | --- | --- |
| `essay_text` | string | 是 | 20～5000 |

响应示例：

```json
{
  "total": 78,
  "content": 32,
  "language": 23,
  "structure": 12,
  "vocabulary": 11,
  "calibrated_total": 79,
  "level": "良好",
  "comment": "内容较充实，语言基本流畅。",
  "strengths": ["要点覆盖较全", "衔接自然"],
  "weaknesses": ["个别时态错误", "词汇稍显单一"],
  "suggestions": "注意时态一致性，尝试使用更多高级词汇。",
  "source": "provider",
  "message": "评分由已配置的 LLM 生成，并经分段校准修正"
}
```

`source` 为 `provider` 时表示评分来自模型服务；为 `fallback` 时表示未配置模型、调用失败或返回格式异常，此时返回本地演示评分（确定性文本质量特征评分）。`level` 为 `优秀 | 良好 | 中等 | 较差` 四档。

## 源码位置

- 路由：`backend/app/main.py`
- 请求与响应模型：`backend/app/models.py`
- LLM 适配器：`backend/app/llm.py`
- 作文评分核心：`backend/app/essay.py`（评分 Prompt、JSON 解析、分段校准、本地降级）
- 前端 API 封装：`frontend/src/lib/api.ts`
- FastAPI 自动文档：`http://127.0.0.1:8000/docs`
