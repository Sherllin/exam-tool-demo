# 智阅考试工具 Demo

这是依据《考试工具功能完善项目 PRD V1.0》和 Figma 原型实现的可运行 Demo。PRD 与原型冲突时以 PRD 为准。

## 已实现

- 成绩发布总览：展示当前考试、脱敏演示数据状态和本期范围。
- 打印轻量配置：字段显隐、字段顺序、基础标题、应用到预览和浏览器打印。
- LLM 标题建议：兼容 Chat Completions 接口；未配置或调用失败时使用明确标识的本地演示建议。
- 班级平均分：限定单次考试和同一年级，以基础表格展示总分与语文、数学、英语平均分。
- 自动化测试：FastAPI 接口、LLM 降级与解析、打印配置、页面核心交互和平均分表格。

## 明确边界

- 数据是脱敏演示数据，不能替代真实客户样例验收。
- 不保存打印配置，不实现多模板、模板复用、排名、趋势、图表、导出或自动诊断。
- 缺考统计口径和最终字段/版式仍待业务确认。
- 英语作文 AI 阅卷不属于本项目；LLM 只生成可编辑标题，不接触或修改成绩。

## 运行环境

- Node.js 20.9 或更高
- pnpm（项目通过 Corepack 固定版本）
- Python 3.12 或更高
- [uv](https://docs.astral.sh/uv/)

## 一键启动

```bash
cd /Users/hesl/Desktop/exam-tool-demo
make setup
make dev
```

浏览器打开 <http://127.0.0.1:3000>。FastAPI 文档位于 <http://127.0.0.1:8000/docs>。

## 可选：连接 LLM

默认无需密钥即可完整演示。若要调用兼容 Chat Completions 的模型服务：

```bash
cd /Users/hesl/Desktop/exam-tool-demo
cp backend/.env.example backend/.env
```

然后填写：

```dotenv
LLM_BASE_URL=https://your-provider.example/v1
LLM_API_KEY=your-key
LLM_MODEL=your-model
```

密钥只由 FastAPI 读取，不会发送到浏览器。重启 `make dev` 后配置生效。

## 验证

```bash
make verify
```

该命令依次执行后端 pytest、前端 Vitest、TypeScript 类型检查和 Next.js 生产构建。

## 项目结构

```text
exam-tool-demo/
├── backend/       FastAPI、演示数据、LLM 适配器与 pytest
├── frontend/      Next.js、React 页面、原生 CSS 与 Vitest
├── docs/          需求设计与实施计划
├── Makefile       setup/dev/test/build/verify 命令
└── README.md
```
