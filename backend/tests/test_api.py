import httpx

from app.main import app


async def api_request(method: str, path: str, **kwargs: object) -> httpx.Response:
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        return await client.request(method, path, **kwargs)


async def test_health_reports_ready_service() -> None:
    response = await api_request("GET", "/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "exam-tool-demo"}


async def test_dashboard_describes_demo_scope_without_unconfirmed_templates() -> None:
    response = await api_request("GET", "/api/dashboard")

    assert response.status_code == 200
    body = response.json()
    assert body["exam"]["id"] == "exam-2026-09"
    assert body["exam"]["grade"] == "高二"
    assert body["class_count"] == 12
    assert body["candidate_count"] == 624
    assert body["data_status"] == "脱敏演示数据"
    assert "template_count" not in body


async def test_print_data_exposes_supported_fields_and_preserves_score_totals() -> None:
    response = await api_request("GET", "/api/exams/exam-2026-09/print-data")

    assert response.status_code == 200
    body = response.json()
    assert [field["id"] for field in body["fields"]] == [
        "student_no",
        "name",
        "class_name",
        "chinese",
        "math",
        "english",
        "total",
    ]
    assert body["sample_notice"] == "脱敏演示数据，待真实客户样例复核"
    for student in body["students"]:
        assert (
            student["total"]
            == student["chinese"] + student["math"] + student["english"]
        )


async def test_class_averages_are_scoped_to_one_exam_and_grade() -> None:
    response = await api_request(
        "GET",
        "/api/exams/exam-2026-09/class-averages",
        params={"grade": "高二"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["exam_id"] == "exam-2026-09"
    assert body["grade"] == "高二"
    assert body["subjects"] == ["语文", "数学", "英语"]
    assert len(body["rows"]) == 6
    assert set(body["rows"][0]) == {
        "class_name",
        "student_count",
        "total_average",
        "subject_averages",
    }
    assert set(body["rows"][0]["subject_averages"]) == {"语文", "数学", "英语"}
    assert body["method_note"].startswith("Demo 口径")


async def test_unknown_exam_or_grade_is_not_mixed_into_results() -> None:
    missing_exam = await api_request("GET", "/api/exams/not-found/print-data")
    wrong_grade = await api_request(
        "GET",
        "/api/exams/exam-2026-09/class-averages",
        params={"grade": "高一"},
    )

    assert missing_exam.status_code == 404
    assert wrong_grade.status_code == 404
