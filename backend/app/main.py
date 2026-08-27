from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Query

from app.demo_data import (
    CLASS_AVERAGES,
    DEMO_EXAM,
    PRINT_FIELDS,
    STUDENT_SCORES,
    SUBJECTS,
)
from app.llm import suggest_title
from app.models import (
    ClassAverageResponse,
    DashboardResponse,
    HealthResponse,
    PrintDataResponse,
    TitleSuggestionRequest,
    TitleSuggestionResponse,
)
from app.settings import Settings, get_settings

app = FastAPI(
    title="考试工具 Demo API",
    version="0.1.0",
    description="PRD-first demo API using deterministic, anonymized sample data.",
)


def _require_demo_exam(exam_id: str) -> None:
    if exam_id != DEMO_EXAM.id:
        raise HTTPException(status_code=404, detail="未找到对应考试")


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse()


@app.get("/api/dashboard", response_model=DashboardResponse)
def dashboard() -> DashboardResponse:
    return DashboardResponse(
        exam=DEMO_EXAM,
        class_count=12,
        candidate_count=624,
        data_status="脱敏演示数据",
        scope_notice="打印字段与统计口径待真实客户样例和业务确认",
    )


@app.get(
    "/api/exams/{exam_id}/print-data",
    response_model=PrintDataResponse,
)
def print_data(exam_id: str) -> PrintDataResponse:
    _require_demo_exam(exam_id)
    return PrintDataResponse(
        exam=DEMO_EXAM,
        default_title=f"{DEMO_EXAM.name}成绩单",
        fields=PRINT_FIELDS,
        students=STUDENT_SCORES,
        sample_notice="脱敏演示数据，待真实客户样例复核",
    )


@app.get(
    "/api/exams/{exam_id}/class-averages",
    response_model=ClassAverageResponse,
)
def class_averages(
    exam_id: str,
    grade: str = Query(min_length=1),
) -> ClassAverageResponse:
    _require_demo_exam(exam_id)
    if grade != DEMO_EXAM.grade:
        raise HTTPException(status_code=404, detail="当前考试下未找到该年级")
    return ClassAverageResponse(
        exam_id=DEMO_EXAM.id,
        exam_name=DEMO_EXAM.name,
        grade=DEMO_EXAM.grade,
        subjects=SUBJECTS,
        rows=CLASS_AVERAGES,
        method_note="Demo 口径：仅统计当前演示数据中的有效成绩；缺考处理规则待业务确认。",
    )


@app.post(
    "/api/llm/title-suggestion",
    response_model=TitleSuggestionResponse,
)
async def title_suggestion(
    request: TitleSuggestionRequest,
    settings: Annotated[Settings, Depends(get_settings)],
) -> TitleSuggestionResponse:
    return await suggest_title(request, settings)
