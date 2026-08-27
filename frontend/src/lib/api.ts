import type {
  ClassAverageData,
  DashboardData,
  EssayGrade,
  EssayGradeRequest,
  PrintData,
  TitleSuggestion,
  TitleSuggestionRequest,
} from "@/lib/types";


export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}


async function fetchJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let message = "请求失败，请稍后重试";
    try {
      const errorBody = (await response.json()) as { detail?: string };
      message = errorBody.detail ?? message;
    } catch {
      // Keep the safe generic message when the upstream body is not JSON.
    }
    throw new ApiError(message, response.status);
  }
  return (await response.json()) as T;
}


export function getDashboard(): Promise<DashboardData> {
  return fetchJson<DashboardData>("/api/dashboard");
}


export function getPrintData(examId: string): Promise<PrintData> {
  return fetchJson<PrintData>(`/api/exams/${encodeURIComponent(examId)}/print-data`);
}


export function getClassAverages(
  examId: string,
  grade: string,
): Promise<ClassAverageData> {
  const query = new URLSearchParams({ grade });
  return fetchJson<ClassAverageData>(
    `/api/exams/${encodeURIComponent(examId)}/class-averages?${query}`,
  );
}


export function requestTitleSuggestion(
  body: TitleSuggestionRequest,
): Promise<TitleSuggestion> {
  return fetchJson<TitleSuggestion>("/api/llm/title-suggestion", {
    method: "POST",
    body: JSON.stringify(body),
  });
}


export function gradeEssay(body: EssayGradeRequest): Promise<EssayGrade> {
  return fetchJson<EssayGrade>("/api/essay/grade", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
