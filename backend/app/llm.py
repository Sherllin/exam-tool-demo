import re

import httpx

from app.models import TitleSuggestionRequest, TitleSuggestionResponse
from app.settings import Settings


def _fallback_title(request: TitleSuggestionRequest) -> str:
    return f"{request.exam_name}{request.document_type}"


def _sanitize_title(raw_title: str) -> str:
    first_line = raw_title.strip().splitlines()[0].strip()
    first_line = re.sub(r"^[#*`\s]+|[#*`\s]+$", "", first_line)
    if not first_line:
        raise ValueError("LLM returned an empty title")
    return first_line[:60]


async def suggest_title(
    request: TitleSuggestionRequest,
    settings: Settings,
    transport: httpx.AsyncBaseTransport | None = None,
) -> TitleSuggestionResponse:
    fallback = _fallback_title(request)
    if not settings.llm_is_configured:
        return TitleSuggestionResponse(
            title=fallback,
            source="fallback",
            message="未配置 LLM，当前为本地演示建议",
        )

    endpoint = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.llm_model,
        "temperature": 0.2,
        "max_tokens": 80,
        "messages": [
            {
                "role": "system",
                "content": (
                    "你是考试成绩材料标题助手。只返回一行简洁中文标题，"
                    "不添加解释、Markdown、成绩判断或排名结论。"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"考试：{request.exam_name}\n"
                    f"年级：{request.grade}\n"
                    f"材料：{request.document_type}"
                ),
            },
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
            title = _sanitize_title(content)
    except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError):
        return TitleSuggestionResponse(
            title=fallback,
            source="fallback",
            message="LLM 暂不可用，已返回本地演示建议",
        )

    return TitleSuggestionResponse(
        title=title,
        source="provider",
        message="标题由已配置的 LLM 生成，请确认后应用",
    )
