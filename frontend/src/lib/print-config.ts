import type { ConfigurableField, PrintField } from "@/lib/types";


export function toConfigurableFields(fields: PrintField[]): ConfigurableField[] {
  return fields.map((field) => ({
    id: field.id,
    label: field.label,
    kind: field.kind,
    visible: field.default_visible,
  }));
}


export function moveField(
  fields: ConfigurableField[],
  fieldId: string,
  direction: "up" | "down",
): ConfigurableField[] {
  const index = fields.findIndex((field) => field.id === fieldId);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= fields.length) {
    return fields.map((field) => ({ ...field }));
  }

  const result = fields.map((field) => ({ ...field }));
  [result[index], result[targetIndex]] = [result[targetIndex], result[index]];
  return result;
}


export function toggleField(
  fields: ConfigurableField[],
  fieldId: string,
): ConfigurableField[] {
  const target = fields.find((field) => field.id === fieldId);
  if (!target) {
    return fields.map((field) => ({ ...field }));
  }

  const visibleCount = fields.filter((field) => field.visible).length;
  if (target.visible && visibleCount === 1) {
    return fields.map((field) => ({ ...field }));
  }

  return fields.map((field) =>
    field.id === fieldId ? { ...field, visible: !field.visible } : { ...field },
  );
}
