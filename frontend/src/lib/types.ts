export type FieldKind = "text" | "score";

export interface ExamSummary {
  id: string;
  name: string;
  grade: string;
}

export interface DashboardData {
  exam: ExamSummary;
  class_count: number;
  candidate_count: number;
  data_status: string;
  scope_notice: string;
}

export interface PrintField {
  id: string;
  label: string;
  kind: FieldKind;
  default_visible: boolean;
}

export interface ConfigurableField {
  id: string;
  label: string;
  kind: FieldKind;
  visible: boolean;
}

export interface StudentScore {
  student_no: string;
  name: string;
  class_name: string;
  chinese: number;
  math: number;
  english: number;
  total: number;
}

export interface PrintData {
  exam: ExamSummary;
  default_title: string;
  fields: PrintField[];
  students: StudentScore[];
  sample_notice: string;
}

export interface ClassAverageRow {
  class_name: string;
  student_count: number;
  total_average: number;
  subject_averages: Record<string, number>;
}

export interface ClassAverageData {
  exam_id: string;
  exam_name: string;
  grade: string;
  subjects: string[];
  rows: ClassAverageRow[];
  method_note: string;
}

export interface TitleSuggestion {
  title: string;
  source: "provider" | "fallback";
  message: string;
}

export interface TitleSuggestionRequest {
  exam_name: string;
  grade: string;
  document_type: string;
}

export interface EssayGrade {
  total: number;
  content: number;
  language: number;
  structure: number;
  vocabulary: number;
  calibrated_total: number;
  level: string;
  comment: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string;
  source: "provider" | "fallback";
  message: string;
}

export interface EssayGradeRequest {
  essay_text: string;
  prompt?: string;
  rubric?: string;
}

export interface BatchEssayItem {
  student_no: string;
  name: string;
  essay_text: string;
}

export interface BatchGradeItem {
  student_no: string;
  name: string;
  grade: EssayGrade;
}

export interface BatchGradeStats {
  count: number;
  avg_total: number;
  avg_calibrated: number;
  max_total: number;
  min_total: number;
  level_distribution: Record<string, number>;
}

export interface BatchGradeRequest {
  prompt?: string;
  rubric?: string;
  essays: BatchEssayItem[];
}

export interface BatchGradeResponse {
  items: BatchGradeItem[];
  stats: BatchGradeStats;
  source: "provider" | "fallback" | "mixed";
  message: string;
}
