import type { Action, ChatRequest, Surface } from "./schema";

export const starters = [
  {
    title: "Explore sales",
    description: "Turn numbers into a clear picture",
    prompt: "Show me the sales dashboard",
    icon: "chart",
  },
  {
    title: "Compare plans",
    description: "Find the right fit for your team",
    prompt: "Compare your product plans",
    icon: "compare",
  },
  {
    title: "Create a request",
    description: "Get things moving with a simple form",
    prompt: "Help me submit a request",
    icon: "form",
  },
] as const;
export function sales(
  period: "quarter" | "year" = "quarter",
  kind: "bar" | "line" | "pie" = "bar",
): Surface {
  const values =
    period === "quarter"
      ? [42, 56, 68]
      : [28, 32, 39, 36, 41, 48, 45, 53, 59, 42, 56, 68];
  const labels =
    period === "quarter"
      ? ["Oct", "Nov", "Dec"]
      : [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
  const total = values.reduce((a, b) => a + b, 0);
  return {
    text: `Here’s your ${period === "quarter" ? "Q4" : "full-year"} sales overview. Explore the sample data below or switch the reporting period.`,
    components: [
      {
        type: "metrics",
        items: [
          {
            label: "Total revenue",
            value: `$${total}k`,
            detail:
              period === "quarter"
                ? "Q4 · sample data"
                : "Full year · sample data",
          },
          {
            label: "Monthly average",
            value: `$${(total / values.length).toFixed(1)}k`,
            detail: `Across ${values.length} months`,
          },
          { label: "Best month", value: "December", detail: "$68k in revenue" },
        ],
      },
      {
        type: "chart",
        title: "Revenue over time",
        kind,
        labels,
        values,
        unit: "$k",
      },
      {
        type: "actions",
        items: [
          {
            label: "This quarter",
            action: { type: "show_sales", period: "quarter" },
          },
          {
            label: "Full year",
            action: { type: "show_sales", period: "year" },
          },
        ],
      },
    ],
  };
}
export function comparison(): Surface {
  return {
    text: "Three plans, side by side. Select a plan to explore the next step. All prices and features are illustrative.",
    components: [
      {
        type: "table",
        title: "A little clarity for your next decision",
        columns: ["Feature", "Starter", "Studio", "Scale"],
        rows: [
          ["Monthly price", "$19", "$49", "$129"],
          ["Team members", "3", "15", "Unlimited"],
          ["Projects", "5", "50", "Unlimited"],
          ["Support", "Community", "Priority", "Dedicated"],
        ],
      },
      {
        type: "actions",
        items: ["Starter", "Studio", "Scale"].map((product) => ({
          label: `Choose ${product}`,
          action: { type: "select_product", product } as Action,
        })),
      },
    ],
  };
}
export function requestForm(): Surface {
  return {
    text: "Let’s get the details. This form creates a demo confirmation in the conversation; it does not send a ticket to an external service.",
    components: [
      {
        type: "request_form",
        title: "Create a request",
        description: "A few details are all we need to get started.",
      },
    ],
  };
}
export function projectStatus(): Surface {
  return {
    text: "Here’s a sample project snapshot. The design foundation is complete, and implementation is moving forward.",
    components: [
      {
        type: "progress",
        title: "Project momentum",
        items: [
          { label: "Design system", value: 100, status: "Complete" },
          { label: "Chat experience", value: 75, status: "In progress" },
          { label: "Component integration", value: 60, status: "On track" },
        ],
      },
      {
        type: "actions",
        items: [
          { label: "Create a request", action: { type: "open_request" } },
        ],
      },
    ],
  };
}
export function actionResponse(action: Action): Surface {
  switch (action.type) {
    case "show_sales":
      return sales(action.period);
    case "compare_products":
      return comparison();
    case "open_request":
      return requestForm();
    case "project_status":
      return projectStatus();
    case "select_product":
      return {
        text: `You selected ${action.product}. This is a demo selection; no purchase or subscription has been made.`,
        components: [
          {
            type: "metrics",
            items: [
              {
                label: "Selected plan",
                value: action.product,
                detail: "Demo selection only",
              },
            ],
          },
          {
            type: "actions",
            items: [
              { label: "Compare again", action: { type: "compare_products" } },
              { label: "Ask for help", action: { type: "open_request" } },
            ],
          },
        ],
      };
    case "submit_request":
      return {
        text: `Demo request received: “${action.title}”. It is shown in this conversation only and has not been saved or sent externally.`,
        components: [
          {
            type: "table",
            title: "Request summary",
            columns: ["Field", "Value"],
            rows: [
              ["Title", action.title],
              ["Category", action.category],
              ["Priority", action.priority],
              ["Status", "Demo confirmation — not saved"],
            ],
          },
        ],
      };
  }
}
export function mockResponse(request: ChatRequest): Surface {
  if (request.action) return actionResponse(request.action);
  const prompt = request.message.toLowerCase();
  if (/request|ticket|form|support/.test(prompt)) return requestForm();
  if (/plan|product|compar|pricing/.test(prompt)) return comparison();
  if (/project|progress|status/.test(prompt)) return projectStatus();
  if (/sales|revenue|chart|dashboard|quarter|year|line|pie/.test(prompt))
    return sales(
      /year|annual/.test(prompt) ? "year" : "quarter",
      /pie/.test(prompt) ? "pie" : /line/.test(prompt) ? "line" : "bar",
    );
  return {
    text: "In demo mode I can show sales charts, compare plans, create a request form, or show project progress. Try one below, or use Live AI for flexible prompts.",
    components: [
      {
        type: "actions",
        items: [
          {
            label: "Show sales",
            action: { type: "show_sales", period: "quarter" },
          },
          { label: "Compare plans", action: { type: "compare_products" } },
          { label: "Create request", action: { type: "open_request" } },
          { label: "Project status", action: { type: "project_status" } },
        ],
      },
    ],
  };
}
