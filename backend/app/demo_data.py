from app.models import (
    ClassAverageRow,
    ExamSummary,
    PrintField,
    StudentScore,
)

DEMO_EXAM = ExamSummary(
    id="exam-2026-09",
    name="高二年级第一次月考",
    grade="高二",
)

PRINT_FIELDS = [
    PrintField(id="student_no", label="学号", kind="text"),
    PrintField(id="name", label="姓名", kind="text"),
    PrintField(id="class_name", label="班级", kind="text"),
    PrintField(id="chinese", label="语文", kind="score"),
    PrintField(id="math", label="数学", kind="score"),
    PrintField(id="english", label="英语", kind="score"),
    PrintField(id="total", label="总分", kind="score"),
]

STUDENT_SCORES = [
    StudentScore(
        student_no="S20260101",
        name="王同学",
        class_name="高二（1）班",
        chinese=91,
        math=94,
        english=89,
        total=274,
    ),
    StudentScore(
        student_no="S20260102",
        name="李同学",
        class_name="高二（1）班",
        chinese=87,
        math=90,
        english=92,
        total=269,
    ),
    StudentScore(
        student_no="S20260103",
        name="陈同学",
        class_name="高二（1）班",
        chinese=89,
        math=86,
        english=88,
        total=263,
    ),
    StudentScore(
        student_no="S20260104",
        name="赵同学",
        class_name="高二（1）班",
        chinese=85,
        math=92,
        english=84,
        total=261,
    ),
    StudentScore(
        student_no="S20260105",
        name="周同学",
        class_name="高二（1）班",
        chinese=92,
        math=88,
        english=90,
        total=270,
    ),
]

SUBJECTS = ["语文", "数学", "英语"]

CLASS_AVERAGES = [
    ClassAverageRow(
        class_name="高二（1）班",
        student_count=52,
        total_average=267.5,
        subject_averages={"语文": 88.4, "数学": 91.2, "英语": 87.9},
    ),
    ClassAverageRow(
        class_name="高二（2）班",
        student_count=51,
        total_average=256.9,
        subject_averages={"语文": 84.8, "数学": 86.4, "英语": 85.7},
    ),
    ClassAverageRow(
        class_name="高二（3）班",
        student_count=53,
        total_average=265.3,
        subject_averages={"语文": 87.5, "数学": 89.6, "英语": 88.2},
    ),
    ClassAverageRow(
        class_name="高二（5）班",
        student_count=50,
        total_average=258.8,
        subject_averages={"语文": 86.1, "数学": 87.8, "英语": 84.9},
    ),
    ClassAverageRow(
        class_name="高二（7）班",
        student_count=49,
        total_average=246.8,
        subject_averages={"语文": 82.9, "数学": 83.1, "英语": 80.8},
    ),
    ClassAverageRow(
        class_name="高二（8）班",
        student_count=52,
        total_average=243.2,
        subject_averages={"语文": 81.7, "数学": 81.6, "英语": 79.9},
    ),
]
