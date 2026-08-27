from typing import Literal

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: Literal["exam-tool-demo"] = "exam-tool-demo"


class ExamSummary(BaseModel):
    id: str
    name: str
    grade: str


class DashboardResponse(BaseModel):
    exam: ExamSummary
    class_count: int
    candidate_count: int
    data_status: str
    scope_notice: str


class PrintField(BaseModel):
    id: str
    label: str
    kind: Literal["text", "score"]
    default_visible: bool = True


class StudentScore(BaseModel):
    student_no: str
    name: str
    class_name: str
    chinese: int = Field(ge=0)
    math: int = Field(ge=0)
    english: int = Field(ge=0)
    total: int = Field(ge=0)


class PrintDataResponse(BaseModel):
    exam: ExamSummary
    default_title: str
    fields: list[PrintField]
    students: list[StudentScore]
    sample_notice: str


class ClassAverageRow(BaseModel):
    class_name: str
    student_count: int = Field(gt=0)
    total_average: float
    subject_averages: dict[str, float]


class ClassAverageResponse(BaseModel):
    exam_id: str
    exam_name: str
    grade: str
    subjects: list[str]
    rows: list[ClassAverageRow]
    method_note: str


class TitleSuggestionRequest(BaseModel):
    exam_name: str = Field(min_length=1, max_length=80)
    grade: str = Field(min_length=1, max_length=30)
    document_type: str = Field(min_length=1, max_length=30)


class TitleSuggestionResponse(BaseModel):
    title: str
    source: Literal["provider", "fallback"]
    message: str


class EssayGradeRequest(BaseModel):
    essay_text: str = Field(min_length=20, max_length=5000)


class EssayGradeResponse(BaseModel):
    total: int = Field(ge=0, le=100)
    content: int = Field(ge=0, le=40)
    language: int = Field(ge=0, le=30)
    structure: int = Field(ge=0, le=15)
    vocabulary: int = Field(ge=0, le=15)
    calibrated_total: int = Field(ge=0, le=100)
    level: str
    comment: str
    strengths: list[str]
    weaknesses: list[str]
    suggestions: str
    source: Literal["provider", "fallback"]
    message: str
