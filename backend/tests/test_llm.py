import json

import httpx
import pytest

from app.llm import suggest_title
from app.main import app
from app.models import TitleSuggestionRequest
from app.settings import Settings


def empty_settings() -> Settings:
    return Settings(
        _env_file=None,
        llm_api_key=None,
        llm_base_url=None,
        llm_model=None,
    )


@pytest.mark.asyncio
async def test_missing_llm_configuration_returns_explicit_fallback() -> None:
    request = TitleSuggestionRequest(
        exam_name="高二年级第一次月考",
        grade="高二",
        document_type="班级成绩单",
    )

    result = await suggest_title(request, empty_settings())

    assert result.title == "高二年级第一次月考班级成绩单"
    assert result.source == "fallback"
    assert result.message == "未配置 LLM，当前为本地演示建议"


@pytest.mark.asyncio
async def test_compatible_provider_response_is_sanitized() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.url == "https://llm.example/v1/chat/completions"
        assert request.headers["authorization"] == "Bearer demo-key"
        payload = json.loads(request.content)
        assert payload["model"] == "demo-model"
        return httpx.Response(
            200,
            json={
                "choices": [{"message": {"content": "  **高二第一次月考成绩单**\n"}}]
            },
        )

    settings = Settings(
        _env_file=None,
        llm_api_key="demo-key",
        llm_base_url="https://llm.example/v1",
        llm_model="demo-model",
    )
    request = TitleSuggestionRequest(
        exam_name="高二年级第一次月考",
        grade="高二",
        document_type="班级成绩单",
    )

    result = await suggest_title(
        request,
        settings,
        transport=httpx.MockTransport(handler),
    )

    assert result.title == "高二第一次月考成绩单"
    assert result.source == "provider"
    assert result.message == "标题由已配置的 LLM 生成，请确认后应用"


@pytest.mark.asyncio
async def test_malformed_provider_response_falls_back_without_failing_demo() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"choices": []})

    settings = Settings(
        _env_file=None,
        llm_api_key="demo-key",
        llm_base_url="https://llm.example/v1",
        llm_model="demo-model",
    )
    request = TitleSuggestionRequest(
        exam_name="高二年级第一次月考",
        grade="高二",
        document_type="班级成绩单",
    )

    result = await suggest_title(
        request,
        settings,
        transport=httpx.MockTransport(handler),
    )

    assert result.source == "fallback"
    assert result.title == "高二年级第一次月考班级成绩单"
    assert result.message == "LLM 暂不可用，已返回本地演示建议"


@pytest.mark.asyncio
async def test_title_suggestion_api_exposes_fallback_source() -> None:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/llm/title-suggestion",
            json={
                "exam_name": "高二年级第一次月考",
                "grade": "高二",
                "document_type": "班级成绩单",
            },
        )

    assert response.status_code == 200
    assert response.json()["source"] == "fallback"
