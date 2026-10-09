import { BarChart } from "@mui/x-charts/BarChart";
import { LineChart } from "@mui/x-charts/LineChart";
import { PieChart } from "@mui/x-charts/PieChart";
import type { UIComponent } from "../shared/schema";
export default function Chart({
  component: c,
}: {
  component: Extract<UIComponent, { type: "chart" }>;
}) {
  const series = [
    {
      data: c.values,
      label: c.unit,
      color: "#8273e4",
      valueFormatter: (v: number | null) => `${v ?? 0} ${c.unit}`,
    },
  ];
  return (
    <div
      role="img"
      aria-label={`${c.title}: ${c.labels.map((label, i) => `${label} ${c.values[i]} ${c.unit}`).join(", ")}`}
    >
      {c.kind === "pie" ? (
        <PieChart
          height={250}
          series={[
            {
              data: c.labels.map((label, i) => ({
                id: i,
                label,
                value: c.values[i],
              })),
              innerRadius: 55,
              paddingAngle: 3,
            },
          ]}
          colors={["#6456d9", "#9d91ed", "#c6bff6", "#dedaef", "#433697"]}
        />
      ) : c.kind === "line" ? (
        <LineChart
          height={250}
          xAxis={[{ scaleType: "point", data: c.labels }]}
          series={series}
        />
      ) : (
        <BarChart
          height={250}
          xAxis={[{ scaleType: "band", data: c.labels }]}
          series={series}
          borderRadius={5}
        />
      )}
    </div>
  );
}
