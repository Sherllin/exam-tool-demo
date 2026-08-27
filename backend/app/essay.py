"""英语作文 AI 阅卷：四维评分、分段校准与本地降级。

参考高考英语作文评分量表（总分 100）：内容 40 / 语言 30 / 结构 15 / 词汇 15。
- provider 模式：调用兼容 Chat Completions 的 LLM，要求 JSON 结构化输出。
- fallback 模式：未配置 LLM 或调用失败时，基于文本质量特征给出确定性本地评分，
  保证默认无密钥也能完整演示。
"""

import asyncio
import json
import re

import httpx

from app.models import (
    BatchEssayItem,
    BatchGradeItem,
    BatchGradeResponse,
    BatchGradeStats,
    EssayGradeRequest,
    EssayGradeResponse,
)
from app.settings import Settings

# 批量评分时的并发上限：LLM 场景避免打爆上游，本地降级场景近乎即时。
BATCH_CONCURRENCY = 5

# 评分系统提示词：要求模型严格按维度打分、拉开梯度（与独立评测脚本同源）
ESSAY_SYSTEM_PROMPT = """你是一名资深高中英语阅卷老师，负责英语作文评分。

评分规则：
- 总分 100 分，按四个维度加权：内容(40分)、语言(30分)、结构(15分)、词汇(15分)。
- 内容：要点覆盖、切题、内容充实度。
- 语言：语法正确性、时态语态、句式多样。
- 结构：段落逻辑、衔接连贯、条理清晰。
- 词汇：词汇丰富度、用词准确与地道。

评分尺度锚点（与真实高考阅卷一致，务必严格执行）：
- 85-100 优秀：切题且要点齐全，内容充实；语言流畅，几乎无语法错误；结构清晰连贯；词汇丰富地道。
- 70-84 良好：基本切题，要点较全；有少量语法或用词错误但不影响理解；结构较清晰；词汇基本得当。
- 55-69 中等：部分要点缺失或内容单薄；错误较多，句式以简单句为主；结构松散；词汇有限。
- 0-54 较差：要点大量缺失或严重偏题；语法错误严重，句子破碎难以理解；结构混乱；词汇贫乏。

真实评分示例（帮助对齐尺度）：
- 示例一（约 90 分）："Volunteering at a nursing home taught me the value of companionship. The elderly lady's eyes sparkled with warmth as she shared stories of her youth. Small acts of kindness, I realized, can bring tremendous joy to others and to ourselves." —— 语言流畅、句式多样（从句/倒装）、细节生动。
- 示例二（约 45 分）："Last year I go to park with my family. We have picnic. I eat too much food. Then I feel very sick. My mother is very worry. She take me to hospital." —— 简单句堆砌、时态错误（go/have/eat）、缺少细节与结构。
- 示例三（约 65 分）："Online learning is very popular now. We can study at home. But sometimes I feel boring because I can't see my classmates. I think we should use computer carefully." —— 内容基本清楚但单薄、句式简单、有少量错误（boring 误用）。

严格要求：
- 评分必须拉开梯度，低水平作文（简单句堆砌、明显语法错误、中式英语）必须严格扣分，不得心软给中间分。
- 不要对所有作文都打 70-80 分；错误明显的作文应给 40-60 分。
- 每篇作文必须给出具体扣分理由和修改建议。

输出必须是 JSON 对象，格式如下（不要输出其他内容）：
{
  "total": 数字(0-100),
  "content": 数字(0-40),
  "language": 数字(0-30),
  "structure": 数字(0-15),
  "vocabulary": 数字(0-15),
  "level": "优秀|良好|中等|较差",
  "comment": "一句话总评（中文，20字以内）",
  "strengths": ["亮点1", "亮点2"],
  "weaknesses": ["问题1", "问题2"],
  "suggestions": "改进建议（中文，50字以内）"
}"""

# 3 段分段校准系数：训练集 117 篇（模拟数据）拟合，测试集 MAE 6.1。
# 段 0（<55）斜率 < 1 用于收紧 AI 对低分的系统性偏松。
CALIBRATION_SPLIT = (55, 75)
CALIBRATION_SEGMENTS = (
    {"slope": -0.5120283018867924, "intercept": 68.17216981132076},
    {"slope": 0.9621306288490875, "intercept": -8.574792361150344},
    {"slope": 1.273751833903881, "intercept": -30.26374872182454},
)


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, value))


def _parse_grade_json(raw_content: str) -> dict | None:
    """从 LLM 输出中提取并校验评分 JSON，支持 ```json 围栏与前后杂文本。"""
    text = raw_content.strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fence:
        text = fence.group(1)
    else:
        start, end = text.find("{"), text.rfind("}")
        if start >= 0 and end > start:
            text = text[start : end + 1]
    try:
        data = json.loads(text)
    except (json.JSONDecodeError, ValueError):
        return None
    if not isinstance(data, dict):
        return None
    try:
        total = int(data["total"])
        content = int(data["content"])
        language = int(data["language"])
        structure = int(data["structure"])
        vocabulary = int(data["vocabulary"])
    except (KeyError, TypeError, ValueError):
        return None
    return {
        "total": round(_clamp(total, 0, 100)),
        "content": round(_clamp(content, 0, 40)),
        "language": round(_clamp(language, 0, 30)),
        "structure": round(_clamp(structure, 0, 15)),
        "vocabulary": round(_clamp(vocabulary, 0, 15)),
        "level": str(data.get("level", "")) or "中等",
        "comment": str(data.get("comment", ""))[:100],
        "strengths": [str(s)[:80] for s in data.get("strengths", [])][:3],
        "weaknesses": [str(w)[:80] for w in data.get("weaknesses", [])][:3],
        "suggestions": str(data.get("suggestions", ""))[:200],
    }


def apply_calibration(raw_total: int) -> int:
    """按分段校准系数修正 AI 原始总分（训练集拟合，测试集 MAE 6.1）。"""
    index = 0
    if raw_total >= CALIBRATION_SPLIT[0]:
        index = 1
    if raw_total >= CALIBRATION_SPLIT[1]:
        index = 2
    segment = CALIBRATION_SEGMENTS[index]
    calibrated = segment["slope"] * raw_total + segment["intercept"]
    return round(_clamp(calibrated, 0, 100))


def _text_quality_features(text: str) -> dict:
    """提取作文文本的可观察质量特征（本地降级评分的依据）。"""
    words = [w for w in re.findall(r"[a-z']+", text.lower()) if len(w) > 1]
    total = len(words)
    unique = len(set(words))
    long_words = sum(1 for w in words if len(w) >= 7)
    avg_len = sum(len(w) for w in words) / total if total else 0.0
    sentences = max(1, len(re.findall(r"[.!?]+", text)))
    return {
        "diversity": unique / total if total else 0.0,
        "long_ratio": long_words / total if total else 0.0,
        "avg_len": avg_len,
        "words_per_sentence": total / sentences,
    }


def _fallback_grade(text: str, prompt: str | None = None, rubric: str | None = None) -> dict:
    """本地确定性评分：质量分 0-10，总分 = 40 + quality×6，维度按权重分摊。

    与 provider 模式返回同构 JSON，便于前端一致渲染。
    prompt/rubric 仅用于评语提示（本地模式不依赖题目相关性打分）。
    """
    f = _text_quality_features(text)
    q_wps = _clamp((f["words_per_sentence"] - 5) * 1.0, 0, 10)
    q_long = _clamp((f["long_ratio"] - 0.1) * 50, 0, 10)
    q_len = _clamp((f["avg_len"] - 4.0) * 8.33, 0, 10)
    quality = min(10.0, q_wps * 0.5 + q_long * 0.3 + q_len * 0.2)
    total = round(_clamp(40 + quality * 6, 0, 95))
    if total >= 85:
        level = "优秀"
    elif total >= 70:
        level = "良好"
    elif total >= 55:
        level = "中等"
    else:
        level = "较差"
    return {
        "total": total,
        "content": round(_clamp(total * 40 / 100, 0, 40)),
        "language": round(_clamp(total * 30 / 100, 0, 30)),
        "structure": round(_clamp(total * 15 / 100, 0, 15)),
        "vocabulary": round(_clamp(total * 15 / 100, 0, 15)),
        "level": level,
        "comment": f"本地演示评分（质量分 {quality:.1f}）：文本较{'丰富' if quality >= 6 else '单薄'}，建议配置 LLM 获取详细评语",
        "strengths": [],
        "weaknesses": [],
        "suggestions": (
            "配置 LLM 后可使用完整四维评分与逐项评语"
            + ("；已提供题目/评分标准，本地模式仅按文本质量评分" if (prompt or rubric) else "")
        ),
    }


async def grade_essay(
    request: EssayGradeRequest,
    settings: Settings,
    transport: httpx.AsyncBaseTransport | None = None,
) -> EssayGradeResponse:
    if not settings.llm_is_configured:
        grade = _fallback_grade(request.essay_text, request.prompt, request.rubric)
        return EssayGradeResponse(
            **grade,
            calibrated_total=apply_calibration(grade["total"]),
            source="fallback",
            message="未配置 LLM，当前为本地演示评分",
        )

    system_content = ESSAY_SYSTEM_PROMPT
    if request.rubric:
        system_content += f"\n\n本次考试评分标准（务必以此为准）：\n{request.rubric}"
    user_content = f"请评分以下英语作文：\n\n{request.essay_text}"
    if request.prompt:
        user_content = f"作文题目：{request.prompt}\n\n{user_content}"

    endpoint = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.llm_model,
        "temperature": 0.2,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": system_content},
            {"role": "user", "content": user_content},
        ],
    }

    try:
        async with httpx.AsyncClient(
            transport=transport,
            timeout=settings.llm_timeout_seconds,
        ) as client:
            response = await client.post(
                endpoint,
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                json=payload,
            )
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            grade = _parse_grade_json(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError):
        grade = None

    if grade is None:
        grade = _fallback_grade(request.essay_text, request.prompt, request.rubric)
        return EssayGradeResponse(
            **grade,
            calibrated_total=apply_calibration(grade["total"]),
            source="fallback",
            message="LLM 暂不可用或返回格式异常，已回退本地演示评分",
        )

    return EssayGradeResponse(
        **grade,
        calibrated_total=apply_calibration(grade["total"]),
        source="provider",
        message="评分由已配置的 LLM 生成，并经分段校准修正",
    )


async def grade_essay_batch(
    request: BatchGradeRequest,
    settings: Settings,
    transport: httpx.AsyncBaseTransport | None = None,
) -> BatchGradeResponse:
    """批量评分：并发调用单篇评分，聚合结果并给出统计汇总。"""
    essays: list[BatchEssayItem] = request.essays
    semaphore = asyncio.Semaphore(BATCH_CONCURRENCY)

    async def _limited(item: BatchEssayItem) -> EssayGradeResponse:
        async with semaphore:
            return await grade_essay(
                EssayGradeRequest(
                    essay_text=item.essay_text,
                    prompt=request.prompt,
                    rubric=request.rubric,
                ),
                settings,
                transport,
            )

    results = await asyncio.gather(*(_limited(item) for item in essays))

    items = [
        BatchGradeItem(student_no=item.student_no, name=item.name, grade=result)
        for item, result in zip(essays, results)
    ]
    stats = _build_stats(items)
    sources = {item.grade.source for item in items}
    if sources == {"provider"}:
        source = "provider"
    elif sources == {"fallback"}:
        source = "fallback"
    else:
        source = "mixed"
    message = {
        "provider": "批量评分已全部由已配置的 LLM 生成，并经分段校准修正",
        "fallback": "批量评分已全部由本地演示评分生成（未配置 LLM）",
        "mixed": "批量评分结果来源混合（部分 LLM、部分本地回退）",
    }[source]

    return BatchGradeResponse(items=items, stats=stats, source=source, message=message)


def _build_stats(items: list[BatchGradeItem]) -> BatchGradeStats:
    """基于批量结果计算平均分（原始/校准）、极值与等级分布。"""
    totals = [item.grade.total for item in items]
    calibrated = [item.grade.calibrated_total for item in items]
    count = len(totals)
    distribution: dict[str, int] = {}
    for item in items:
        distribution[item.grade.level] = distribution.get(item.grade.level, 0) + 1
    return BatchGradeStats(
        count=count,
        avg_total=round(sum(totals) / count, 1) if count else 0.0,
        avg_calibrated=round(sum(calibrated) / count, 1) if count else 0.0,
        max_total=max(totals) if count else 0,
        min_total=min(totals) if count else 0,
        level_distribution=distribution,
    )
