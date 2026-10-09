import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import type { Action, Surface, UIComponent } from "../shared/schema";
const Chart = lazy(() => import("./Chart"));
type Props = {
  onAction: (action: Action, label: string) => void;
  disabled: boolean;
};
function RequestForm({
  component,
  onAction,
  disabled,
}: Props & { component: Extract<UIComponent, { type: "request_form" }> }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<
    "Design" | "Engineering" | "Support"
  >("Design");
  const [priority, setPriority] = useState<"Low" | "Normal" | "High">("Normal");
  return (
    <form
      className="surface-card"
      onSubmit={(event) => {
        event.preventDefault();
        if (title.trim().length < 3) return;
        onAction(
          { type: "submit_request", title: title.trim(), category, priority },
          `Submit request: ${title.trim()}`,
        );
      }}
    >
      <h3>{component.title}</h3>
      <p className="muted">{component.description}</p>
      <Stack spacing={2}>
        <TextField
          label="Request title"
          required
          fullWidth
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          slotProps={{ htmlInput: { minLength: 3, maxLength: 120 } }}
          disabled={disabled}
        />
        <div className="form-row">
          <TextField
            select
            fullWidth
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            disabled={disabled}
          >
            {["Design", "Engineering", "Support"].map((x) => (
              <MenuItem key={x} value={x}>
                {x}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            fullWidth
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as typeof priority)}
            disabled={disabled}
          >
            {["Low", "Normal", "High"].map((x) => (
              <MenuItem key={x} value={x}>
                {x}
              </MenuItem>
            ))}
          </TextField>
        </div>
        <div>
          <Button
            type="submit"
            variant="contained"
            disabled={disabled || title.trim().length < 3}
          >
            Submit demo request
          </Button>
        </div>
      </Stack>
    </form>
  );
}
function RenderComponent({
  component,
  ...props
}: Props & { component: UIComponent }) {
  switch (component.type) {
    case "text":
      return <p className="response-copy">{component.text}</p>;
    case "metrics":
      return (
        <div className="metrics">
          {component.items.map((item, i) => (
            <div className="metric" key={i}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          ))}
        </div>
      );
    case "chart":
      return (
        <div className="surface-card">
          <div className="card-heading">
            <h3>{component.title}</h3>
            <span className="data-label">Sample data · {component.unit}</span>
          </div>
          <Suspense
            fallback={
              <div className="chart-loading">
                <LinearProgress />
              </div>
            }
          >
            <Chart component={component} />
          </Suspense>
        </div>
      );
    case "table":
      return (
        <div className="surface-card">
          <h3>{component.title}</h3>
          <div className="table-scroll">
            <Table size="small" aria-label={component.title}>
              <TableHead>
                <TableRow>
                  {component.columns.map((column, i) => (
                    <TableCell key={i}>{column}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {component.rows.map((row, i) => (
                  <TableRow key={i}>
                    {row.map((value, j) => (
                      <TableCell key={j}>{value}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      );
    case "actions":
      return (
        <div className="action-row">
          {component.items.map((item, i) => (
            <Button
              key={i}
              variant={i === 0 ? "contained" : "outlined"}
              disabled={props.disabled}
              onClick={() => props.onAction(item.action, item.label)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      );
    case "request_form":
      return <RequestForm component={component} {...props} />;
    case "progress":
      return (
        <div className="surface-card">
          <h3>{component.title}</h3>
          {component.items.map((item, i) => (
            <div className="progress-item" key={i}>
              <div>
                <span>{item.label}</span>
                <Chip size="small" label={item.status} variant="outlined" />
                <strong>{item.value}%</strong>
              </div>
              <LinearProgress
                aria-label={item.label}
                variant="determinate"
                value={item.value}
                sx={{ height: 7, borderRadius: 4 }}
              />
            </div>
          ))}
        </div>
      );
  }
}
class SurfaceBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <Alert severity="warning">
        This component could not be displayed. Try another prompt.
      </Alert>
    ) : (
      this.props.children
    );
  }
}
export default function SurfaceRenderer({
  surface,
  ...props
}: Props & { surface: Surface }) {
  return (
    <div className="surface">
      <p className="response-copy">{surface.text}</p>
      {surface.components.map((component, i) => (
        <SurfaceBoundary key={i}>
          <RenderComponent component={component} {...props} />
        </SurfaceBoundary>
      ))}
    </div>
  );
}
