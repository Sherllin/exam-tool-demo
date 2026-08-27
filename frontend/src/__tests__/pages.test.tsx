import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AverageTable } from "@/components/average-table";
import { Dashboard } from "@/components/dashboard";
import { PrintDesigner } from "@/components/print-designer";
import type {
  ClassAverageData,
  DashboardData,
  PrintData,
} from "@/lib/types";


const dashboardData: DashboardData = {
  exam: {
    id: "exam-2026-09",
    name: "高二年级第一次月考",
    grade: "高二",
  },
  class_count: 12,
  candidate_count: 624,
  data_status: "脱敏演示数据",
  scope_notice: "待真实客户样例复核",
};

const printData: PrintData = {
  exam: dashboardData.exam,
  default_title: "高二年级第一次月考成绩单",
  sample_notice: "脱敏演示数据，待真实客户样例复核",
  fields: [
    { id: "name", label: "姓名", kind: "text", default_visible: true },
    { id: "math", label: "数学", kind: "score", default_visible: true },
    { id: "total", label: "总分", kind: "score", default_visible: true },
  ],
  students: [
    {
      student_no: "S1",
      name: "王同学",
      class_name: "高二（1）班",
      chinese: 91,
      math: 94,
      english: 89,
      total: 274,
    },
  ],
};

const averageData: ClassAverageData = {
  exam_id: "exam-2026-09",
  exam_name: "高二年级第一次月考",
  grade: "高二",
  subjects: ["语文", "数学", "英语"],
  method_note: "Demo 口径：缺考规则待确认。",
  rows: [
    {
      class_name: "高二（1）班",
      student_count: 52,
      total_average: 267.5,
      subject_averages: { 语文: 88.4, 数学: 91.2, 英语: 87.9 },
    },
  ],
};


describe("PRD-first pages", () => {
  it("dashboard links to the two in-scope capabilities", () => {
    render(<Dashboard data={dashboardData} />);

    expect(screen.getByRole("link", { name: "配置打印结果" })).toHaveAttribute(
      "href",
      "/print",
    );
    expect(screen.getByRole("link", { name: "查看班级对比" })).toHaveAttribute(
      "href",
      "/comparison",
    );
    expect(screen.queryByText("多模板管理")).not.toBeInTheDocument();
    expect(screen.queryByText(/AI 准确率/)).not.toBeInTheDocument();
  });

  it("applies field visibility changes to the print preview", async () => {
    const user = userEvent.setup();
    render(<PrintDesigner data={printData} />);

    const preview = screen.getByTestId("print-preview");
    expect(within(preview).getByRole("columnheader", { name: "数学" })).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: "数学" }));
    expect(within(preview).getByRole("columnheader", { name: "数学" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "应用到预览" }));
    expect(
      within(preview).queryByRole("columnheader", { name: "数学" }),
    ).not.toBeInTheDocument();
  });

  it("shows whether a title came from the provider or fallback", async () => {
    const user = userEvent.setup();
    const suggestTitle = vi.fn().mockResolvedValue({
      title: "高二月考班级成绩单",
      source: "fallback",
      message: "未配置 LLM，当前为本地演示建议",
    });
    render(<PrintDesigner data={printData} suggestTitle={suggestTitle} />);

    await user.click(screen.getByRole("button", { name: "AI 生成标题建议" }));

    expect(screen.getByLabelText("基础标题")).toHaveValue("高二月考班级成绩单");
    expect(screen.getByText("未配置 LLM，当前为本地演示建议")).toBeVisible();
  });

  it("renders total and every subject average as table columns", () => {
    render(<AverageTable data={averageData} />);

    expect(screen.getByRole("columnheader", { name: "总分平均分" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "语文平均分" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "数学平均分" })).toBeVisible();
    expect(screen.getByRole("columnheader", { name: "英语平均分" })).toBeVisible();
    expect(screen.getByRole("rowheader", { name: "高二（1）班" })).toBeVisible();
  });
});
