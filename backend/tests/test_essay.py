import json

import httpx
import pytest

from app.essay import apply_calibration, grade_essay
from app.main import app
from app.models import EssayGradeRequest
from app.settings import Settings

DEMO_ESSAY = (
    "Last weekend I went to the park with my family. We had a picnic under "
    "the big tree. I flew a kite with my little brother. The weather was "
    "sunny and warm. I was very happy because we spent time together."
)

GOOD_ESSAY = (
    "Volunteering at a nursing home taught me the value of companionship. "
    "The elderly lady's eyes sparkled with warmth as she shared stories of "
    "her youth. Small acts of kindness, I realized, can bring tremendous "
    "joy to others and to ourselves. It was an experience I will treasure "
    "forever, and it inspired me to keep giving back to my community."
)


def empty_settings() -> Settings:
    return Settings(
        _env_file=None,
        llm_api_key=None,
        llm_base_url=None,
        llm_model=None,
    )


def configured_settings() -> Settings:
    return Settings(
        _env_file=None,
        llm_api_key="demo-key",
        llm_base_url="https://llm.example/v1",
        llm_model="demo-model",
    )


@pytest.mark.asyncio
async def test_missing_llm_configuration_returns_local_fallback() -> None:
    request = EssayGradeRequest(essay_text=DEMO_ESSAY)

    result = await grade_essay(request, empty_settings())

    assert result.source == "fallback"
    assert result.message == "未配置 LLM，当前为本地演示评分"
    assert 0 <= result.total <= 100
    assert result.content + result.language + result.structure + result.vocabulary <= 100
    assert result.calibrated_total == apply_calibration(result.total)


@pytest.mark.asyncio
async def test_provider_json_response_is_parsed_and_calibrated() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == "https://llm.example/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer demo-key"
        payload = json.loads(request.content)
        assert payload["model"] == "demo-model"
        assert payload["response_format"] == {"type": "json_object"}
        grade = {
            "total": 88,
            "content": 36,
            "language": 26,
            "structure": 13,
            "vocabulary": 13,
            "level": "优秀",
            "comment": "内容充实，语言流畅。",
            "strengths": ["细节生动", "句式多样"],
            "weaknesses": ["个别小错误"],
            "suggestions": "保持句式多样性。",
        }
        return httpx.Response(
            200,
            json={"choices": [{"message": {"content": json.dumps(grade, ensure_ascii=False)}}]},
        )

    request = EssayGradeRequest(essay_text=GOOD_ESSAY)

    result = await grade_essay(
        request,
        configured_settings(),
        transport=httpx.MockTransport(handler),
    )

    assert result.source == "provider"
    assert result.total == 88
    assert result.content == 36
    assert result.level == "优秀"
    assert result.calibrated_total == apply_calibration(88)


@pytest.mark.asyncio
async def test_provider_fenced_json_response_is_parsed() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        body = (
            "```json\n"
            '{"total": 65, "content": 26, "language": 20, "structure": 10, '
            '"vocabulary": 9, "level": "中等", "comment": "内容基本清楚", '
            '"strengths": [], "weaknesses": [], "suggestions": ""}\n'
            "```"
        )
        return httpx.Response(200, json={"choices": [{"message": {"content": body}}]})

    request = EssayGradeRequest(essay_text=DEMO_ESSAY)

    result = await grade_essay(
        request,
        configured_settings(),
        transport=httpx.MockTransport(handler),
    )

    assert result.source == "provider"
    assert result.total == 65
    assert result.level == "中等"


@pytest.mark.asyncio
async def test_malformed_provider_response_falls_back() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": [{"message": {"content": "抱歉，无法评分"}}]})

    request = EssayGradeRequest(essay_text=DEMO_ESSAY)

    result = await grade_essay(
        request,
        configured_settings(),
        transport=httpx.MockTransport(handler),
    )

    assert result.source == "fallback"
    assert result.message == "LLM 暂不可用或返回格式异常，已回退本地演示评分"


@pytest.mark.asyncio
async def test_essay_grade_api_exposes_fallback_source() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/essay/grade",
            json={"essay_text": DEMO_ESSAY},
        )

    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "fallback"
    assert "total" in body
    assert "calibrated_total" in body


@pytest.mark.asyncio
async def test_essay_grade_api_rejects_short_input() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/essay/grade",
            json={"essay_text": "too short"},
        )

    assert response.status_code == 422


def test_apply_calibration_segments_are_consistent() -> None:
    # 各分段输出应落在 0-100 范围内（含越界输入）
    for raw in (-10, 0, 40, 55, 60, 75, 85, 100, 120):
        assert 0 <= apply_calibration(raw) <= 100
    assert apply_calibration(-10) != apply_calibration(0)  # 段 0 为负斜率（收紧低分偏松）
