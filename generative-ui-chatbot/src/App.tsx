import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import AddRounded from "@mui/icons-material/AddRounded";
import ArrowUpwardRounded from "@mui/icons-material/ArrowUpwardRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import BarChartRounded from "@mui/icons-material/BarChartRounded";
import CheckRounded from "@mui/icons-material/CheckRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import CodeRounded from "@mui/icons-material/CodeRounded";
import CompareArrowsRounded from "@mui/icons-material/CompareArrowsRounded";
import DashboardRounded from "@mui/icons-material/DashboardRounded";
import DescriptionRounded from "@mui/icons-material/DescriptionRounded";
import ForumOutlined from "@mui/icons-material/ForumOutlined";
import SurfaceRenderer from "./SurfaceRenderer";
import { parseSurface, type Action, type Surface } from "../shared/schema";
import { starters } from "../shared/demo";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  surface?: Surface;
  source?: string;
  requestId?: string;
};
export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"mock" | "live">("mock");
  const [liveAvailable, setLiveAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [inspect, setInspect] = useState<Message | null>(null);
  const [catalog, setCatalog] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/config", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setLiveAvailable(data.liveAvailable === true))
      .catch(() => {});
    return () => {
      controller.abort();
      abortRef.current?.abort();
    };
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }, [messages, busy]);
  async function send(text: string, action?: Action) {
    if (inFlight.current || !text.trim()) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setInput("");
    const user: Message = {
      id: crypto.randomUUID(),
      role: "user",
      text: text.trim(),
    };
    setMessages((current) => [...current, user]);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(40000),
        ]),
        body: JSON.stringify({
          mode,
          message: user.text,
          action,
          history: messages
            .slice(-12)
            .map((m) => ({ role: m.role, content: m.text.slice(0, 2000) })),
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "The server could not respond.");
      const surface = parseSurface(data.surface);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: surface.text,
          surface,
          source: data.source,
          requestId: data.requestId,
        },
      ]);
    } catch (err) {
      if (!controller.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Unable to connect. Check that the server is running.",
        );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  const latest = messages.filter((m) => m.role === "assistant").at(-1);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="Canvas home">
          <span className="brand-mark">
            <AutoAwesomeRounded />
          </span>
          canvas<span className="brand-dot">.</span>
        </a>
        <Button
          className="new-chat"
          variant="outlined"
          startIcon={<AddRounded />}
          disabled={busy}
          onClick={() => {
            setMessages([]);
            setError("");
          }}
        >
          New conversation
        </Button>
        <div className="nav-label">WORKSPACE</div>
        <button className="nav-item active" onClick={() => setCatalog(false)}>
          <ForumOutlined /> Playground <span className="nav-dot" />
        </button>
        <button className="nav-item" onClick={() => setCatalog(true)}>
          <DashboardRounded /> Component catalog{" "}
          <span className="nav-count">7</span>
        </button>
        <div className="nav-label examples-label">TRY AN EXAMPLE</div>
        {starters.map((s, i) => (
          <button
            className="example-nav"
            disabled={busy}
            key={s.title}
            onClick={() => void send(s.prompt)}
          >
            <span>0{i + 1}</span>
            {s.title}
          </button>
        ))}
        <div className="sidebar-bottom">
          <div className="material-badge">
            <span className="material-symbol">M</span>
            <div>
              <strong>Built with Material UI</strong>
              <small>One catalog. Endless conversations.</small>
            </div>
          </div>
          <div className="profile">
            <span className="avatar">AA</span>
            <div>
              <strong>Your workspace</strong>
              <small>Generative UI playground</small>
            </div>
            <span className="online-dot" />
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span> <strong>Playground</strong>
          </div>
          <div className="topbar-actions">
            <Chip
              size="small"
              variant="outlined"
              icon={<CheckRounded />}
              label="Material UI"
            />
            <TextField
              select
              size="small"
              aria-label="Response mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              disabled={busy}
              slotProps={{
                select: { inputProps: { "aria-label": "Response mode" } },
              }}
            >
              <MenuItem value="mock">Demo mode</MenuItem>
              <MenuItem value="live" disabled={!liveAvailable}>
                Live AI{!liveAvailable ? " · setup needed" : ""}
              </MenuItem>
            </TextField>
          </div>
        </header>
        <div
          className={`conversation ${messages.length ? "has-messages" : ""}`}
        >
          {messages.length === 0 ? (
            <section className="welcome">
              <div className="welcome-icon">
                <AutoAwesomeRounded />
              </div>
              <div className="eyebrow">A NEW WAY TO INTERACT</div>
              <h1>
                More than answers.
                <br />
                <span>An interface for every idea.</span>
              </h1>
              <p>
                Ask a question. Get a chart, a comparison, or a form.
                <br className="desktop-break" /> A conversation that comes to
                life with you.
              </p>
              <div className="starter-grid">
                {starters.map((s) => (
                  <button
                    className="starter-card"
                    key={s.title}
                    disabled={busy}
                    onClick={() => void send(s.prompt)}
                  >
                    <span className={`starter-icon ${s.icon}`}>
                      {s.icon === "chart" ? (
                        <BarChartRounded />
                      ) : s.icon === "compare" ? (
                        <CompareArrowsRounded />
                      ) : (
                        <DescriptionRounded />
                      )}
                    </span>
                    <strong>
                      {s.title}
                      <span>↗</span>
                    </strong>
                    <small>{s.description}</small>
                  </button>
                ))}
              </div>
              <div className="welcome-note">
                <span className="online-dot" /> Interactive components, right
                inside the conversation
              </div>
            </section>
          ) : (
            <div className="message-list">
              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  {message.role === "user" ? (
                    <div className="user-bubble">{message.text}</div>
                  ) : (
                    <>
                      <div className="assistant-label">
                        <span className="mini-mark">
                          <AutoAwesomeRounded />
                        </span>
                        <strong>Canvas</strong>
                        <span>
                          {message.source === "live" ? "Live AI" : "Demo"} ·
                          Material UI
                        </span>
                        <Tooltip title="Inspect response JSON">
                          <IconButton
                            size="small"
                            aria-label="Inspect response JSON"
                            onClick={() => setInspect(message)}
                          >
                            <CodeRounded fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </div>
                      <SurfaceRenderer
                        surface={message.surface!}
                        disabled={busy}
                        onAction={(action, label) => void send(label, action)}
                      />
                    </>
                  )}
                </article>
              ))}
            </div>
          )}
          {busy && (
            <div className="thinking" role="status">
              <CircularProgress size={16} /> Composing your response…
            </div>
          )}
          {error && (
            <Alert
              severity="error"
              className="error-banner"
              onClose={() => setError("")}
            >
              {error}
            </Alert>
          )}
          <div ref={endRef} />
        </div>
        <footer className="composer-area">
          <div className="composer-wrap">
            {messages.length > 0 && (
              <div className="composer-tools">
                <Button
                  size="small"
                  startIcon={<AddRounded />}
                  disabled={busy}
                  onClick={() => {
                    setMessages([]);
                    setError("");
                  }}
                >
                  New conversation
                </Button>
                {latest && (
                  <Button
                    size="small"
                    startIcon={<CodeRounded />}
                    onClick={() => setInspect(latest)}
                  >
                    View response JSON
                  </Button>
                )}
              </div>
            )}
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                void send(input);
              }}
            >
              <TextField
                fullWidth
                multiline
                maxRows={4}
                variant="standard"
                placeholder="Ask Canvas to show you something…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                slotProps={{
                  input: { disableUnderline: true },
                  htmlInput: {
                    "aria-label": "Message Canvas",
                    maxLength: 2000,
                  },
                }}
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey &&
                    !e.nativeEvent.isComposing
                  ) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
              />
              <IconButton
                type="submit"
                className="send-button"
                aria-label="Send message"
                disabled={busy || !input.trim()}
              >
                <ArrowUpwardRounded />
              </IconButton>
            </form>
            <div className="composer-caption">
              <span>
                {mode === "mock"
                  ? "Demo mode · Sample data · No API key needed"
                  : "Live AI · Sample data · Responses may be inaccurate"}
              </span>
              <span className="keyboard-hint">↵ to send</span>
            </div>
          </div>
        </footer>
      </main>
      <Dialog
        open={!!inspect}
        onClose={() => setInspect(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Response JSON
          <IconButton
            aria-label="Close inspector"
            sx={{ float: "right" }}
            onClick={() => setInspect(null)}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <p className="muted">
            Validated catalog schema · {inspect?.requestId}
          </p>
          <pre className="json-preview">
            {JSON.stringify(inspect?.surface, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
      <Dialog
        open={catalog}
        onClose={() => setCatalog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Component catalog
          <IconButton
            aria-label="Close catalog"
            sx={{ float: "right" }}
            onClick={() => setCatalog(false)}
          >
            <CloseRounded />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <p className="muted">
            Seven approved component types. The model chooses the composition;
            Material UI controls the rendering.
          </p>
          {[
            ["Text", "Readable, plain-text responses"],
            ["Metrics", "A set of summary cards"],
            ["Chart", "Bar, line, and pie charts"],
            ["Table", "Structured comparisons and summaries"],
            ["Actions", "Buttons with validated events"],
            ["Request form", "Text input, selects, and submission"],
            ["Progress", "Status indicators and progress bars"],
          ].map(([name, description]) => (
            <div className="catalog-row" key={name}>
              <strong>{name}</strong>
              <span>{description}</span>
            </div>
          ))}
          <Alert severity="info" sx={{ mt: 2 }}>
            Live AI requires only OPENAI_API_KEY in the server .env file.
            OPENAI_MODEL is optional. Restart after configuration.
          </Alert>
        </DialogContent>
      </Dialog>
    </div>
  );
}
