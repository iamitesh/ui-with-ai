import { z } from "zod";

const label = z.string().min(1).max(160);
const text = z.string().max(2000);
export const actionSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("show_sales"),
      period: z.enum(["quarter", "year"]),
    })
    .strict(),
  z.object({ type: z.literal("compare_products") }).strict(),
  z
    .object({
      type: z.literal("select_product"),
      product: z.enum(["Starter", "Studio", "Scale"]),
    })
    .strict(),
  z.object({ type: z.literal("open_request") }).strict(),
  z.object({ type: z.literal("project_status") }).strict(),
  z
    .object({
      type: z.literal("submit_request"),
      title: z.string().trim().min(3).max(120),
      category: z.enum(["Design", "Engineering", "Support"]),
      priority: z.enum(["Low", "Normal", "High"]),
    })
    .strict(),
]);
const button = z.object({ label, action: actionSchema }).strict();
export const componentSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), text }).strict(),
  z
    .object({
      type: z.literal("metrics"),
      items: z
        .array(z.object({ label, value: label, detail: label }).strict())
        .min(1)
        .max(4),
    })
    .strict(),
  z
    .object({
      type: z.literal("chart"),
      title: label,
      kind: z.enum(["bar", "line", "pie"]),
      labels: z.array(label).min(1).max(24),
      values: z
        .array(z.number().finite().nonnegative().max(1e12))
        .min(1)
        .max(24),
      unit: z.string().max(30),
    })
    .strict(),
  z
    .object({
      type: z.literal("table"),
      title: label,
      columns: z.array(label).min(1).max(6),
      rows: z.array(z.array(z.string().max(300)).min(1).max(6)).max(20),
    })
    .strict(),
  z
    .object({
      type: z.literal("actions"),
      items: z.array(button).min(1).max(4),
    })
    .strict(),
  z
    .object({
      type: z.literal("request_form"),
      title: label,
      description: text,
    })
    .strict(),
  z
    .object({
      type: z.literal("progress"),
      title: label,
      items: z
        .array(
          z
            .object({
              label,
              value: z.number().min(0).max(100),
              status: z.enum(["On track", "In progress", "Complete"]),
            })
            .strict(),
        )
        .min(1)
        .max(8),
    })
    .strict(),
]);
// Keep the wire schema declarative; apply cross-field constraints after generation too.
export const surfaceSchema = z
  .object({ text, components: z.array(componentSchema).max(10) })
  .strict();
export type Surface = z.infer<typeof surfaceSchema>;
export type UIComponent = z.infer<typeof componentSchema>;
export type Action = z.infer<typeof actionSchema>;
export const requestSchema = z
  .object({
    mode: z.enum(["mock", "live"]),
    message: z.string().trim().min(1).max(2000),
    history: z
      .array(
        z
          .object({ role: z.enum(["user", "assistant"]), content: text })
          .strict(),
      )
      .max(12)
      .default([]),
    action: actionSchema.optional(),
  })
  .strict();
export type ChatRequest = z.infer<typeof requestSchema>;
export function parseSurface(value: unknown): Surface {
  const result = surfaceSchema.parse(value);
  for (const component of result.components) {
    if (
      component.type === "chart" &&
      component.labels.length !== component.values.length
    )
      throw new Error("Chart data must align with labels");
    if (
      component.type === "table" &&
      component.rows.some((row) => row.length !== component.columns.length)
    )
      throw new Error("Table rows must align with columns");
    if (
      component.type === "actions" &&
      component.items.some((item) => item.action.type === "submit_request")
    )
      throw new Error("Request submissions require the editable form");
  }
  return result;
}
