import { describe, expect, it } from "vitest";

import { moveField, toggleField } from "@/lib/print-config";
import type { ConfigurableField } from "@/lib/types";


const fields: ConfigurableField[] = [
  { id: "name", label: "姓名", kind: "text", visible: true },
  { id: "math", label: "数学", kind: "score", visible: true },
  { id: "total", label: "总分", kind: "score", visible: true },
];


describe("print field configuration", () => {
  it("moves a field up without mutating the original list", () => {
    const result = moveField(fields, "total", "up");

    expect(result.map((field) => field.id)).toEqual(["name", "total", "math"]);
    expect(fields.map((field) => field.id)).toEqual(["name", "math", "total"]);
  });

  it("leaves a boundary field in place", () => {
    const result = moveField(fields, "name", "up");

    expect(result).toEqual(fields);
  });

  it("toggles a visible field off", () => {
    const result = toggleField(fields, "math");

    expect(result.find((field) => field.id === "math")?.visible).toBe(false);
  });

  it("keeps at least one field visible", () => {
    const oneVisible = fields.map((field) => ({
      ...field,
      visible: field.id === "name",
    }));

    const result = toggleField(oneVisible, "name");

    expect(result).toEqual(oneVisible);
  });
});
