"""仿真演示数据：12 个班级、624 名考生、语数英 150 分制。

数据由固定随机种子程序化生成，保证每次启动结果一致：
- 名单：常见姓氏 + 常用名组合，全年级不重复
- 成绩：按班级分层设定均值与标准差的正态分布（重点班 / 平行班）
- 班级平均分：由各班学生成绩实时统计，与明细数据完全一致
"""

import random

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
    exam_date="2026-09-26",
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

SUBJECTS = ["语文", "数学", "英语"]

# (班级, 班级类型, 人数, 语文均值, 数学均值, 英语均值, 标准差)
# 1、2 班为重点班，其余为平行班，成绩均值逐班略有差异，符合真实月考分布。
_CLASS_PROFILES = [
    ("高二（1）班", "重点班", 54, 110.0, 114.0, 112.0, 11.0),
    ("高二（2）班", "重点班", 52, 108.0, 111.0, 110.0, 10.5),
    ("高二（3）班", "平行班", 53, 103.5, 98.0, 100.0, 12.0),
    ("高二（4）班", "平行班", 52, 102.0, 96.5, 98.5, 12.5),
    ("高二（5）班", "平行班", 51, 101.0, 95.0, 97.0, 13.0),
    ("高二（6）班", "平行班", 53, 100.5, 93.5, 96.0, 13.5),
    ("高二（7）班", "平行班", 52, 99.0, 91.0, 94.5, 14.0),
    ("高二（8）班", "平行班", 52, 98.0, 89.5, 93.0, 14.5),
    ("高二（9）班", "平行班", 51, 96.5, 87.0, 91.5, 15.0),
    ("高二（10）班", "平行班", 52, 95.0, 85.0, 90.0, 15.5),
    ("高二（11）班", "平行班", 52, 94.0, 83.5, 89.0, 16.0),
    ("高二（12）班", "平行班", 50, 93.0, 82.0, 88.0, 16.5),
]

_SURNAMES = [
    "王", "李", "张", "刘", "陈", "杨", "黄", "赵", "吴", "周",
    "徐", "孙", "马", "朱", "胡", "郭", "何", "林", "罗", "高",
    "郑", "梁", "谢", "宋", "唐", "许", "韩", "冯", "邓", "曹",
    "彭", "曾", "肖", "田", "董", "潘", "袁", "蔡", "蒋", "余",
    "于", "杜", "叶", "程", "苏", "魏", "吕", "丁", "任", "沈",
    "姚", "卢", "姜", "崔", "钟", "谭", "陆", "汪", "范", "金",
]

_GIVEN_NAMES = [
    "伟", "芳", "娜", "敏", "静", "磊", "军", "洋", "勇", "艳",
    "杰", "娟", "涛", "明", "超", "霞", "平", "刚", "辉", "玲",
    "文", "婷", "建华", "建军", "玉兰", "子涵", "欣怡", "浩然", "雨桐", "梓萱",
    "俊杰", "梦琪", "思远", "若曦", "天佑", "佳怡", "志强", "慧敏", "文博", "语嫣",
    "瑞霖", "晓彤", "冠宇", "诗涵", "铭泽", "芷晴", "俊豪", "乐瑶", "绍辉", "静怡",
    "泽宇", "紫萱", "昊然", "语桐", "景行", "沐宸", "婉婷", "承泽", "欣妍", "明哲",
    "梓萌", "一诺", "雨泽", "晨曦", "可馨", "睿哲", "雨欣", "浩宇", "嘉懿", "梓睿",
    "思彤", "博文", "煜城", "悦宁", "子墨", "乐然", "诗琪", "俊熙", "雅静", "天翊",
    "欣雨", "皓轩", "若溪", "芸熙", "恺乐", "芷若", "奕辰", "若彤", "锐泽", "淑慧",
    "文昊", "安琪", "弘毅", "佳琪", "旭尧", "思涵", "珂欣", "家豪", "嘉怡", "宇轩",
    "静宜", "峻熙", "曼妮", "昊宇", "乐怡", "泽楷", "心怡", "浩铭", "美琳", "志豪",
    "雪莹", "成宇", "慧妍", "子健", "晓婷", "铭浩", "慧琳", "天乐", "丽华", "俊楠",
    "诗雅", "雨晨", "韵寒", "梓杰", "欣瑶", "修杰", "玉婷", "鸿飞", "思琦", "凯文",
    "雅琪", "梓航", "泽瑞", "悦彤", "立诚", "思雨", "子轩", "梦洁", "翊凡", "芷兰",
    "正豪", "若男", "慧娟", "文轩", "语晨", "凯瑞", "欣彤", "睿泽", "明轩", "子昂",
    "佳欣", "博超", "忆彤", "弘文", "雅楠", "峻豪", "晨熙", "文杰", "悦然", "俊驰",
    "浩轩", "思颖", "彬彬", "可欣", "宇航", "静茹", "凯乐", "紫涵", "智宸", "雨馨",
    "语琴", "金鑫", "婉清", "志远", "静雯", "昊洋", "诗语", "成轩", "佳宁", "若琳",
    "曼婷", "宇豪", "雅雯", "志伟", "雪梅", "明浩", "晓雪", "子豪", "梦涵", "凯伦",
    "骏哲", "晓燕", "文韬", "欣悦", "逸飞", "雅芳", "昊阳", "秀兰", "梓豪", "丽丽",
    "奕博", "惠敏", "天宇", "静雅", "沐阳", "晓丽", "嘉豪", "淑珍", "皓铭",
]

_SEED = 20260901


def _clamp_score(rng: random.Random, mean: float, std: float) -> int:
    return max(30, min(150, round(rng.gauss(mean, std))))


def _generate_students() -> list[StudentScore]:
    rng = random.Random(_SEED)
    name_pool = [f"{surname}{given}" for surname in _SURNAMES for given in _GIVEN_NAMES]
    rng.shuffle(name_pool)
    names = iter(name_pool)

    students: list[StudentScore] = []
    for class_no, (class_name, _class_type, size, c_mean, m_mean, e_mean, std) in enumerate(
        _CLASS_PROFILES, start=1
    ):
        for seq in range(1, size + 1):
            chinese = _clamp_score(rng, c_mean, std)
            math = _clamp_score(rng, m_mean, std)
            english = _clamp_score(rng, e_mean, std)
            students.append(
                StudentScore(
                    student_no=f"2026{class_no:02d}{seq:02d}",
                    name=next(names),
                    class_name=class_name,
                    chinese=chinese,
                    math=math,
                    english=english,
                    total=chinese + math + english,
                )
            )
    return students


_ALL_STUDENTS = _generate_students()

# 打印预览使用高二（1）班整班名单（54 人），呈现真实成绩单效果。
STUDENT_SCORES = [s for s in _ALL_STUDENTS if s.class_name == "高二（1）班"]


def _build_class_averages() -> list[ClassAverageRow]:
    rows: list[ClassAverageRow] = []
    for class_name, class_type, _size, _c, _m, _e, _std in _CLASS_PROFILES:
        members = [s for s in _ALL_STUDENTS if s.class_name == class_name]
        count = len(members)
        rows.append(
            ClassAverageRow(
                class_name=class_name,
                class_type=class_type,
                student_count=count,
                total_average=round(sum(s.total for s in members) / count, 1),
                subject_averages={
                    subject: round(
                        sum(getattr(s, key) for s in members) / count, 1
                    )
                    for subject, key in (
                        ("语文", "chinese"),
                        ("数学", "math"),
                        ("英语", "english"),
                    )
                },
            )
        )
    return rows


CLASS_AVERAGES = _build_class_averages()

# 全年级规模由班级数据派生，避免与明细不一致。
CLASS_COUNT = len(CLASS_AVERAGES)
CANDIDATE_COUNT = sum(row.student_count for row in CLASS_AVERAGES)
