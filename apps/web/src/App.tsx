import React, { useEffect, useRef, useState, Suspense, lazy } from "react";
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  Bell,
  BookOpenCheck,
  BotMessageSquare,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  FileText,
  Gauge,
  Link2,
  LoaderCircle,
  Menu,
  Mic,
  MicOff,
  Moon,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sun,
  Volume2,
  VolumeX,
  WalletCards,
  X,
} from "lucide-react";
import { api, money, patch, post, prettyDate, remove } from "./lib/api";
import type { JsonRecord } from "./lib/api";
import {
  PortfolioAllocationChart,
  HoldingsComparisonChart,
  SectorExposureVisualizer,
  PerformanceDiagnostic,
} from "./components/PortfolioCharts";
import {
  BrandMark,
  VoiceWaveform,
  VoiceStatusBadge,
  ThinkingBubble,
  AgentActivityTrace,
  type VoiceState,
} from "./components/VoiceActivityComponents";

const MarketNetwork3D = lazy(() => import("./components/MarketNetwork3D"));

type Page = "assistant" | "portfolio" | "research" | "discovery" | "monitoring" | "orders" | "connections";
type Message = { role: "user" | "assistant"; content: string; data?: JsonRecord | null; tool_calls?: JsonRecord[]; model_usage?: JsonRecord | null };

const nav: { id: Page; label: string; icon: any; group: string }[] = [
  { id: "assistant", label: "Assistant", icon: BotMessageSquare, group: "Workspace" },
  { id: "portfolio", label: "Portfolio", icon: BriefcaseBusiness, group: "Workspace" },
  { id: "research", label: "Research", icon: BookOpenCheck, group: "Workspace" },
  { id: "discovery", label: "Discovery", icon: Compass, group: "Tools" },
  { id: "monitoring", label: "Monitoring", icon: Bell, group: "Tools" },
  { id: "orders", label: "Trade", icon: WalletCards, group: "Tools" },
  { id: "connections", label: "Connections", icon: Link2, group: "Settings" },
];

const demoSymbols = ["NORTHSTAR", "RIVERSTONE", "CEDARTECH", "MAPLEBIO"];
const demoSectors: Record<string, string> = { NORTHSTAR: "Industrials", RIVERSTONE: "Consumer staples", CEDARTECH: "Technology", MAPLEBIO: "Healthcare" };
const researchSymbols = ["NORTHSTAR"];
const companyNames: Record<string, string> = {
  NORTHSTAR: "Northstar Components Ltd",
  RIVERSTONE: "Riverstone Foods Ltd",
  CEDARTECH: "Cedar Technologies Ltd",
  MAPLEBIO: "Maple Bio Ltd",
};
const instrumentIds: Record<string, string> = {
  NORTHSTAR: "NSE:NORTHSTAR:EQ:INR",
  RIVERSTONE: "NSE:RIVERSTONE:EQ:INR",
  CEDARTECH: "BSE:CEDARTECH:EQ:INR",
  MAPLEBIO: "NSE:MAPLEBIO:EQ:INR",
};
const spokenQuantities: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10 };

function App() {
  const [page, setPage] = useState<Page>("assistant");
  const [tradeSymbol, setTradeSymbol] = useState("");
  const [health, setHealth] = useState<JsonRecord | null>(null);
  const [mcpState, setMcpState] = useState<JsonRecord | null>(null);
  const [toast, setToast] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try {
      const saved = localStorage.getItem("market_partner_theme");
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    } catch {
      return "dark";
    }
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("market_partner_theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    void api<JsonRecord>("/api/health").then(setHealth).catch((error) => setToast(error.message));
    void api<JsonRecord>("/api/mcp/status").then(setMcpState).catch(() => setMcpState({ connected: false }));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const title = nav.find((item) => item.id === page)?.label ?? "Assistant";
  const notify = (message: string) => setToast(message);

  return (
    <div className="app-shell">
      {mobileNavOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside className={`sidebar ${mobileNavOpen ? "mobile-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><BrandMark size={24} /></div>
          <div>
            <div className="brand-name">market partner</div>
            <div className="brand-caption">institutional · research · trade</div>
          </div>
        </div>
        <div className="workspace-switcher">
          <div className="avatar">TM</div>
          <div className="workspace-copy"><strong>Tom’s workspace</strong><span>Demo investor</span></div>
          <ChevronDown size={14} className="muted" />
        </div>
        {(["Workspace", "Tools", "Settings"] as const).map((group) => (
          <div className="nav-group" key={group}>
            <div className="nav-group-label">{group}</div>
            {nav.filter((item) => item.group === group).map(({ id, label, icon: Icon }) => (
              <button
                className={`nav-item ${page === id ? "active" : ""}`}
                key={id}
                onClick={() => {
                  setPage(id);
                  setMobileNavOpen(false);
                }}
              >
                <Icon size={16} strokeWidth={1.8} /><span>{label}</span>
                {id === "monitoring" && <span className="nav-dot" aria-label="New alerts" />}
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <div className="status-row"><span className={`status-led ${health?.status === "ok" ? "online" : ""}`} /><span>{health?.status === "ok" ? "Service connected" : "Connecting…"}</span></div>
            <div className="status-meta">{mcpState?.connected ? `MCP ${mcpState.protocol_version ?? "connected"}` : "MCP checking"}</div>
          </div>
          <button className="help-link" onClick={() => notify("Market Partner is a local demo with synthetic data. Provider access is disabled until configured.")}><CircleHelp size={15} /> Help & data notes</button>
          <div className="profile-row"><div className="avatar avatar-small">TM</div><div className="workspace-copy"><strong>Tom Mathew</strong><span>Demo investor</span></div><ChevronDown size={14} className="muted" /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="breadcrumbs"><span>Workspace</span><ArrowRight size={13} /><strong>{title}</strong></div>
          </div>
          <div className="topbar-actions">
            <button
              className="theme-toggle-btn"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <span className="env-pill"><span className="status-led online" /> Sample workspace</span>
            <span className="demo-warning"><ShieldCheck size={14} /> Synthetic demo data</span>
          </div>
        </header>
        <div className="page-content">
          {page === "assistant" && <AssistantPage notify={notify} onTradeSymbol={(symbol) => { setTradeSymbol(symbol); setPage("orders"); }} onOpenOrders={() => setPage("orders")} />}
          {page === "portfolio" && <PortfolioPage notify={notify} />}
          {page === "research" && <ResearchPage notify={notify} />}
          {page === "discovery" && <DiscoveryPage notify={notify} />}
          {page === "monitoring" && <MonitoringPage notify={notify} />}
          {page === "orders" && <OrdersPage notify={notify} initialSymbol={tradeSymbol} />}
          {page === "connections" && <ConnectionsPage notify={notify} />}
        </div>
      </main>
      {toast && <div className="toast" role="status"><span>{toast}</span><button onClick={() => setToast("")} aria-label="Dismiss notification"><X size={16} /></button></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, copy, action }: { eyebrow: string; title: string; copy: string; action?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{copy}</p></div>{action}</div>;
}

function SectionHeading({ title, detail, action }: { title: string; detail?: string; action?: React.ReactNode }) {
  return <div className="section-heading"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div>;
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function Button({ children, onClick, variant = "primary", disabled = false, type = "button", icon }: {
  children: React.ReactNode; onClick?: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; disabled?: boolean; type?: "button" | "submit"; icon?: React.ReactNode;
}) {
  return <button className={`button button-${variant}`} onClick={onClick} disabled={disabled} type={type}>{icon}{children}</button>;
}

function Loading({ label = "Loading" }: { label?: string }) {
  return <div className="loading-state"><LoaderCircle className="spin" size={18} /> {label}</div>;
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <div className="empty-state"><div className="empty-icon"><FileText size={19} /></div><strong>{title}</strong><span>{copy}</span></div>;
}

function DataBadge({ children, tone = "green" }: { children: React.ReactNode; tone?: "green" | "amber" | "gray" }) {
  return <span className={`data-badge badge-${tone}`}><span className="badge-dot" />{children}</span>;
}

function AssistantPage({ notify, onTradeSymbol, onOpenOrders }: { notify: (message: string) => void; onTradeSymbol: (symbol: string) => void; onOpenOrders: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi Tom. Ask me to research a company, review your sample portfolio, or prepare a paper-order preview from terms you provide. I’ll show the evidence and ask you to confirm any order on screen." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("ready");
  const [voiceErrorMessage, setVoiceErrorMessage] = useState("");
  const [audioLevels, setAudioLevels] = useState<number[]>([0.15, 0.2, 0.15, 0.3, 0.2, 0.25, 0.15]);
  const [speaking, setSpeaking] = useState(true);

  const recognition = useRef<SpeechRecognition | null>(null);
  const speakingEnabled = useRef(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const stopAudioCapture = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels([0.15, 0.2, 0.15, 0.3, 0.2, 0.25, 0.15]);
  };

  const send = async (text = input) => {
    const message = text.trim();
    if (!message || sending) return;
    const history = messages.filter((item) => item.role === "user" || item.role === "assistant").slice(-12).map(({ role, content }) => ({ role, content }));
    setMessages((old) => [...old, { role: "user", content: message }]);
    setInput("");
    setSending(true);
    setVoiceState("processing");

    try {
      const result = await post<JsonRecord>("/api/chat", { message, history });
      const response = { role: "assistant" as const, content: result.reply, data: result.data, tool_calls: result.tool_calls, model_usage: result.model_usage };
      setMessages((old) => [...old, response]);

      if (speakingEnabled.current && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(result.reply);
        utterance.lang = "en-IN";
        const voices = window.speechSynthesis.getVoices();
        utterance.voice = voices.find((voice) => voice.lang.toLowerCase() === "en-in")
          ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("en"))
          ?? null;

        utterance.onstart = () => setVoiceState("speaking");
        utterance.onend = () => setVoiceState("ready");
        utterance.onerror = () => setVoiceState("ready");

        window.speechSynthesis.speak(utterance);
      } else {
        setVoiceState("ready");
      }

      if (result.mode === "fixture_router") notify("Model conversation is off. Enable Sarvam in the local server configuration for agent-led replies.");
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "The assistant could not complete that request.";
      setMessages((old) => [...old, { role: "assistant", content: errorText }]);
      setVoiceState("ready");
    } finally {
      setSending(false);
    }
  };

  const toggleMic = async () => {
    if (voiceState === "listening") {
      recognition.current?.stop();
      stopAudioCapture();
      setVoiceState("ready");
      return;
    }

    setVoiceErrorMessage("");
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) {
      setVoiceState("error");
      setVoiceErrorMessage("Speech recognition unavailable in this browser.");
      notify("Speech recognition is not available in this browser. You can use the text box instead.");
      return;
    }

    // Capture real audio stream via Web Audio API to drive waveform amplitude
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 32;
          analyserRef.current = analyser;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLevels = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            const levels: number[] = [];
            const step = Math.max(1, Math.floor(dataArray.length / 7));
            for (let i = 0; i < 7; i++) {
              const val = dataArray[i * step] || 0;
              levels.push(Math.max(0.12, Math.min(1.0, val / 255)));
            }
            setAudioLevels(levels);
            animFrameRef.current = requestAnimationFrame(updateLevels);
          };
          animFrameRef.current = requestAnimationFrame(updateLevels);
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Microphone access blocked. Please allow mic permissions in your browser."
          : "Microphone unavailable. Check your audio settings or type below.";
      setVoiceState("error");
      setVoiceErrorMessage(errorMsg);
      notify(errorMsg);
      return;
    }

    const instance = new Constructor();
    instance.lang = "en-IN";
    instance.continuous = false;
    instance.interimResults = true;

    instance.onresult = (event) => {
      const result = event.results[0];
      const transcript = result?.[0]?.transcript ?? "";
      if (result?.isFinal && transcript.trim()) {
        stopAudioCapture();
        void send(transcript);
      }
    };

    instance.onerror = (event: any) => {
      stopAudioCapture();
      if (event.error !== "no-speech") {
        setVoiceState("error");
        setVoiceErrorMessage(`Speech recognition error (${event.error}).`);
        notify(`Speech input stopped (${event.error}). You can type your request instead.`);
      } else {
        setVoiceState("ready");
      }
    };

    instance.onend = () => {
      stopAudioCapture();
      setVoiceState((current) => (current === "listening" ? "ready" : current));
    };

    recognition.current = instance;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    try {
      instance.start();
      setVoiceState("listening");
    } catch {
      stopAudioCapture();
      setVoiceState("error");
      setVoiceErrorMessage("Could not start speech input. Check browser permissions.");
      notify("Could not start the microphone. Check browser permission and try again.");
    }
  };

  const toggleSpeaking = () => {
    const enabled = !speakingEnabled.current;
    speakingEnabled.current = enabled;
    if (!enabled && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(enabled);
    if (!enabled && voiceState === "speaking") {
      setVoiceState("ready");
    }
  };

  useEffect(() => () => {
    recognition.current?.stop();
    stopAudioCapture();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  return <div className="assistant-layout alexa-assistant">
    <div className="assistant-main">
      <div className="voice-stage">
        <button
          type="button"
          className={`voice-orb ${voiceState === "listening" ? "is-listening" : ""} ${voiceState === "processing" ? "is-thinking" : ""} ${voiceState === "speaking" ? "is-speaking" : ""} ${voiceState === "error" ? "is-error" : ""}`}
          onClick={toggleMic}
          disabled={sending}
          aria-label={voiceState === "listening" ? "Stop listening" : "Start a voice conversation"}
        >
          <span className="voice-orb-halo" />
          <span className="voice-orb-core">
            {voiceState === "listening" || voiceState === "speaking" ? (
              <VoiceWaveform state={voiceState} audioLevels={audioLevels} />
            ) : voiceState === "processing" ? (
              <LoaderCircle className="spin" size={20} />
            ) : voiceState === "error" ? (
              <AlertCircle size={20} />
            ) : (
              <Mic size={20} />
            )}
          </span>
        </button>
        <div className="voice-stage-copy">
          <div className="voice-stage-topline">
            <div className="eyebrow">Market Partner · voice + touch</div>
            <VoiceStatusBadge state={voiceState} errorMessage={voiceErrorMessage} />
          </div>
          <h1>
            {voiceState === "listening"
              ? "I’m listening…"
              : voiceState === "processing"
              ? "Evaluating evidence & querying tools…"
              : voiceState === "speaking"
              ? "Voice response active"
              : voiceState === "error"
              ? "Microphone attention needed"
              : "What would you like to explore?"}
          </h1>
          <p>
            {voiceState === "listening"
              ? "Speak your request — transcript will be evaluated on completion."
              : voiceState === "processing"
              ? "Cross-referencing verified holdings and research packets."
              : voiceState === "error"
              ? voiceErrorMessage || "Check browser microphone settings or type below."
              : "Research a company, understand portfolio exposure, or rehearse a paper order."}
          </p>
        </div>
      </div>
      <section className="stock-carousel-panel" aria-label="Demo stock list">
        <div className="stock-carousel-heading"><div><div className="eyebrow">Explore the sample universe</div><h2>Which company should we look at?</h2></div><DataBadge tone="amber">Fictional · no live quotes</DataBadge></div>
        <div className="stock-carousel">{demoSymbols.map((symbol) => <article className="stock-carousel-item" key={symbol}>
          <div className="stock-carousel-identity"><span className="stock-monogram">{symbol.slice(0, 1)}</span><div><strong>{symbol}</strong><span>{demoSectors[symbol]}</span></div></div>
          <p>{companyNames[symbol].replace(" Ltd", "")}</p>
          <button className="stock-carousel-action" onClick={() => onTradeSymbol(symbol)}>Open paper ticket <ArrowRight size={15} /></button>
        </article>)}</div>
      </section>
      <div className="assistant-conversation">
        <div className="conversation-topline">
          <div className="assistant-avatar"><BrandMark size={16} /></div>
          <div><strong>Market Partner</strong><span>Conversation · sample workspace</span></div>
          <div className="conversation-tools">
            <span className="connection-tag"><span className="status-led online" /> Ready</span>
            <button className="icon-button" onClick={toggleSpeaking} aria-label={speaking ? "Mute voice response" : "Enable voice response"}>
              {speaking ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          </div>
        </div>
        <div className="message-list" aria-live="polite">
          {messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
            {message.role === "assistant" && <div className="message-avatar"><BrandMark size={14} /></div>}
            <div className="message-content">
              <div className="message-bubble">{message.content}</div>
              <AgentActivityTrace
                toolCalls={message.tool_calls}
                modelUsage={message.model_usage}
                data={message.data}
              />
              {message.data && <ChatResult data={message.data} notify={notify} onOpenOrders={onOpenOrders} />}
            </div>
          </div>)}
          {sending && <ThinkingBubble />}
        </div>
        <form className="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <button
            type="button"
            className={`mic-button ${voiceState === "listening" ? "listening" : ""}`}
            onClick={toggleMic}
            disabled={sending}
            aria-label={voiceState === "listening" ? "Stop speech input" : "Start speech input"}
          >
            {voiceState === "listening" ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={voiceState === "listening" ? "Listening to your voice…" : "Ask Market Partner anything…"}
            aria-label="Ask Market Partner"
          />
          <button className="send-button" disabled={!input.trim() || sending} type="submit" aria-label="Send message">
            <Send size={17} />
          </button>
        </form>
        <div className="composer-foot">
          <span>{voiceState === "listening" ? "Listening · speak clearly or click mic to finish." : "Tap to talk · real audio frequency visualization active."}</span>
          <span>English (India)</span>
        </div>
      </div>
      <div className="prompt-suggestions"><span className="suggestion-label">Try saying</span>{[
        "Research NORTHSTAR and show both sides",
        "What is my NORTHSTAR exposure?",
        "Preview a paper buy of 2 NORTHSTAR at 1500 rupees in Sample Account A",
      ].map((prompt) => <button key={prompt} onClick={() => void send(prompt)}>{prompt}<ArrowRight size={14} /></button>)}</div>
    </div>
    <aside className="assistant-aside">
      <div className="aside-card alexa-environment-card"><div className="eyebrow">Current workspace</div><h2>Sample data, clear limits.</h2><div className="environment-stat"><span>Company universe</span><strong>4 fictional stocks</strong></div><div className="environment-stat"><span>Research packet</span><strong>1 company</strong></div><div className="environment-stat"><span>Order path</span><strong>Paper simulator</strong></div><div className="stock-data-note"><ShieldCheck size={15} /> Quotes are unavailable; you enter the limit price.</div></div>
      <div className="aside-card alexa-guidance-card"><div className="welcome-spark"><BrandMark size={20} /></div><div className="eyebrow">Evidence before action</div><h3>See both sides.<br />Keep your agency.</h3><p>Research shows the strongest case, the countercase, sources, and open questions. Orders always need your on-screen confirmation.</p><div className="mini-rule" /><div className="welcome-foot"><ShieldCheck size={16} /> No personalized trade advice</div></div>
    </aside>
  </div>;
}

function ChatResult({ data, notify, onOpenOrders }: { data: JsonRecord; notify: (message: string) => void; onOpenOrders: () => void }) {
  const sources = data.source_packet ?? data.snapshot?.positions;
  const orderPreview = data.preview_id ? data : data.result?.preview_id ? data.result : null;
  if (orderPreview) return <PaperOrderPreviewCard data={orderPreview} notify={notify} onOpenOrders={onOpenOrders} />;
  if (data.source_packet) {
    return <div className="chat-result-card"><div className="result-card-head"><strong>{data.company_name}</strong><DataBadge tone="amber">Synthetic source packet</DataBadge></div><div className="result-two-col"><div><span className="micro-label">Supported case</span><p>{data.supported_case?.[0] ?? "No supported case returned."}</p></div><div><span className="micro-label">Countercase</span><p>{data.countercase?.[0] ?? "No countercase returned."}</p></div></div><div className="citation-pills">{(sources ?? []).slice(0, 4).map((source: JsonRecord) => <span key={source.source_id}><FileText size={12} />{source.title}</span>)}</div></div>;
  }
  if (data.snapshot) return <div className="chat-result-card"><div className="result-card-head"><strong>Sample portfolio snapshot</strong><DataBadge tone="amber">Fixture</DataBadge></div><p>{data.summary}</p><div className="citation-pills"><span><BriefcaseBusiness size={12} />{data.snapshot.positions?.length ?? 0} positions</span><span><Activity size={12} />As of {prettyDate(data.snapshot.as_of)}</span></div></div>;
  if (Array.isArray(data)) return <div className="chat-result-card"><strong>Workflow result</strong><p>{data.length} records returned. Open the relevant workspace panel to review details.</p></div>;
  return <div className="chat-result-card"><div className="result-card-head"><strong>Workflow result</strong><DataBadge tone="gray">Structured data</DataBadge></div><pre>{JSON.stringify(data, null, 2).slice(0, 1100)}</pre></div>;
}

function PaperOrderPreviewCard({ data, notify, onOpenOrders }: { data: JsonRecord; notify: (message: string) => void; onOpenOrders: () => void }) {
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<JsonRecord | null>(null);
  const [error, setError] = useState("");
  const symbol = data.symbol ?? data.instrument_id?.split(":")[1] ?? "Selected security";
  const sandbox = data.mode === "sandbox";

  const confirmPreview = async () => {
    if (!reviewed || busy || confirmedOrder) return;
    setBusy(true);
    setError("");
    try {
      const { confirmation_token } = await post<{ confirmation_token: string }>(`/api/orders/${data.preview_id}/confirmation-token`, { explicit_confirmation: true });
      const order = await post<JsonRecord>(`/api/orders/${data.preview_id}/confirm`, {
        explicit_confirmation: true,
        confirmation_token,
        idempotency_key: crypto.randomUUID(),
      });
      setConfirmedOrder(order);
      notify(sandbox ? "Sandbox paper order confirmed. No live brokerage order was sent." : "Paper order recorded locally. No brokerage or exchange order was sent.");
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "This preview could not be confirmed. Review or create a fresh preview.";
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  return <section className="chat-order-card" aria-label="Paper order preview">
    <div className="chat-order-head"><div><div className="eyebrow">Review every term</div><h3>{data.side} {data.quantity} {symbol}</h3></div><DataBadge tone="amber">{sandbox ? "Sandbox simulation" : "Paper simulation"}</DataBadge></div>
    <div className="chat-order-terms">
      <div><span>Limit price</span><strong>{money(Math.round(Number(data.limit_price) * 100))}</strong></div>
      <div><span>Estimated total</span><strong>{money(data.estimated_value_minor)}</strong></div>
      <div><span>Account</span><strong>{data.account_alias ?? "Sample account"}</strong></div>
      <div><span>Preview expires</span><strong>{prettyDate(data.expires_at)}</strong></div>
    </div>
    {(data.warning || data.mode === "local_paper") && <p className="chat-order-warning"><ShieldCheck size={15} />{data.warning ?? "This is a local simulation. Nothing is sent to a broker or exchange."}</p>}
    {confirmedOrder ? <div className="chat-order-confirmed"><ShieldCheck size={17} /><span><strong>Paper order recorded</strong><small>{confirmedOrder.status?.replaceAll("_", " ") ?? "Confirmation received"} · {confirmedOrder.order_id}</small></span><button className="text-action" onClick={onOpenOrders}>View orders</button></div> : <div className="chat-order-confirm-row"><label className="checkbox-label"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} /><span>I reviewed the exact security, side, quantity, account, and limit price. Confirm this {sandbox ? "sandbox" : "local paper"} simulation.</span></label><Button onClick={() => void confirmPreview()} disabled={!reviewed || busy} icon={<Check size={16} />}>{busy ? "Confirming…" : "Confirm paper order"}</Button></div>}
    {error && <p className="chat-order-error" role="alert">{error}</p>}
  </section>;
}

function PortfolioPage({ notify }: { notify: (message: string) => void }) {
  const [overview, setOverview] = useState<JsonRecord | null>(null);
  const [activities, setActivities] = useState<JsonRecord[]>([]);
  const [performance, setPerformance] = useState<JsonRecord | null>(null);
  const [broker, setBroker] = useState<JsonRecord | null>(null);
  const [symbol, setSymbol] = useState("NORTHSTAR");
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const [overviewResult, activityResult, performanceResult] = await Promise.all([
        api<JsonRecord>("/api/portfolio/overview"),
        api<JsonRecord[]>("/api/portfolio/activities"),
        api<JsonRecord>("/api/portfolio/performance?period=all"),
      ]);
      setOverview(overviewResult);
      setActivities(activityResult);
      setPerformance(performanceResult);
    } catch (error) { notify(error instanceof Error ? error.message : "Portfolio could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const checkBroker = async () => {
    try { setBroker(await api<JsonRecord>(`/api/portfolio/broker-research?symbol=${encodeURIComponent(symbol)}`)); }
    catch (error) { notify(error instanceof Error ? error.message : "Broker research could not be loaded."); }
  };

  if (loading) return <Loading label="Loading sample portfolio" />;
  return <div className="page-stack">
    <PageHeading eyebrow="Portfolio intelligence" title="Know what the data can say." copy="A read-only view of the sample accounts, with coverage and timestamps kept in sight." action={<Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => void refresh()}>Refresh snapshot</Button>} />
    <div className="notice notice-amber"><ShieldCheck size={17} /><div><strong>Sample portfolio · synthetic values</strong><span>These accounts, positions, valuations, and activities are fictional. They do not represent your actual brokerage accounts.</span></div></div>
    {overview && <>
      <div className="metric-grid">
        <MetricCard label="Valued holdings" value={money(overview.invested_holdings_value_minor)} detail="Excludes the position with missing valuation" icon={<WalletCards size={17} />} />
        <MetricCard label="Positions" value={`${overview.snapshot.positions.length}`} detail={`As of ${prettyDate(overview.snapshot.as_of)}`} icon={<BriefcaseBusiness size={17} />} />
        <MetricCard label="Coverage" value={overview.snapshot.coverage === "partial" ? "Partial" : overview.snapshot.coverage} detail="One sample position has no value" icon={<Gauge size={17} />} tone="amber" />
        <MetricCard label="Account mode" value="Fixture" detail="Two sample accounts · read-only" icon={<ShieldCheck size={17} />} />
      </div>
      <div className="content-grid half-and-half">
        <PortfolioAllocationChart overview={overview} />
        <HoldingsComparisonChart overview={overview} />
      </div>
      <div className="content-grid two-thirds">
        <Panel>
          <SectionHeading title="Current positions" detail="Grouped by instrument · amount shown in INR" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Security</th>
                  <th>Account</th>
                  <th style={{ textAlign: "right" }}>Quantity</th>
                  <th style={{ textAlign: "right" }}>Market value</th>
                  <th style={{ textAlign: "right" }}>As of</th>
                </tr>
              </thead>
              <tbody>
                {overview.snapshot.positions.map((position: JsonRecord) => (
                  <tr key={`${position.account_ref}-${position.symbol}`}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span className="table-primary">{position.symbol}</span>
                        {position.exchange && <span className="data-badge badge-gray">{position.exchange}</span>}
                      </div>
                      <div className="table-secondary">{position.company_name}</div>
                    </td>
                    <td>{position.account_alias}</td>
                    <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>{position.quantity}</td>
                    <td style={{ fontFamily: "var(--font-mono)", textAlign: "right", fontWeight: 600 }}>
                      {position.market_value_minor != null ? (
                        money(position.market_value_minor)
                      ) : (
                        <span className="data-badge badge-amber">Missing value</span>
                      )}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {position.valuation_as_of ? prettyDate(position.valuation_as_of) : <span className="text-amber">Unavailable</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footnote"><CircleHelp size={13} /> Missing valuation is unavailable, not zero. This view is not total net worth or buying power.</div>
        </Panel>
        <SectorExposureVisualizer overview={overview} />
      </div>
    </>}
    <div className="content-grid two-thirds">
      <Panel><SectionHeading title="Account activity" detail="Synthetic sample records · incomplete fee history" />
        {activities.length ? <div className="activity-list">{activities.map((item) => <div className="activity-item" key={item.activity_id}><div className={`activity-type ${item.activity_type === "BUY" ? "buy" : "sell"}`}><ArrowDownLeft size={15} /></div><div className="activity-copy"><strong>{item.activity_type} {item.instrument_id.split(":")[1]}</strong><span>{prettyDate(item.date)} · {item.account_alias}</span></div><div className="activity-amount">{item.gross_amount_minor ? money(item.gross_amount_minor) : "Amount unavailable"}<span>Fees incomplete</span></div></div>)}</div> : <EmptyState title="No sample activities available" copy="Connect a sample account to see its fixture history." />}
      </Panel>
      <PerformanceDiagnostic performance={performance} />
    </div>
    <Panel><SectionHeading title="Broker-published research" detail="Kept separate from Market Partner analysis" action={<div className="inline-form"><select aria-label="Select demo security" value={symbol} onChange={(event) => setSymbol(event.target.value)}>{demoSymbols.map((item) => <option key={item}>{item}</option>)}</select><Button variant="secondary" onClick={() => void checkBroker()} icon={<Search size={14} />}>Check availability</Button></div>} />
      {broker ? <div className="broker-unavailable"><BookOpenCheck size={17} /><div><strong>Provider not configured</strong><span>{broker.message}</span></div></div> : <div className="inline-hint">Broker-authored analysis will never be replaced with model-generated content.</div>}
    </Panel>
  </div>;
}

function MetricCard({ label, value, detail, icon, tone = "green" }: { label: string; value: string; detail: string; icon: React.ReactNode; tone?: "green" | "amber" }) {
  return <div className="metric-card"><div className={`metric-icon ${tone === "amber" ? "metric-amber" : ""}`}>{icon}</div><span className="metric-label">{label}</span><strong className="metric-value">{value}</strong><span className="metric-detail">{detail}</span></div>;
}

function ResearchPage({ notify }: { notify: (message: string) => void }) {
  const [symbol, setSymbol] = useState("NORTHSTAR");
  const [question, setQuestion] = useState("Summarize the strongest supported case and countercase.");
  const [run, setRun] = useState<JsonRecord | null>(null);
  const [dossiers, setDossiers] = useState<JsonRecord[]>([]);
  const [savedDossier, setSavedDossier] = useState("");
  const [comparison, setComparison] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [networkPosition, setNetworkPosition] = useState<"top" | "bottom">("bottom");

  const loadDossiers = async () => { setDossiers(await api<JsonRecord[]>("/api/dossiers")); };
  useEffect(() => { void loadDossiers().catch((error) => notify(error.message)); }, []);
  const research = async () => {
    setLoading(true); setComparison(null);
    try { setRun(await post<JsonRecord>("/api/research", { symbol, question })); }
    catch (error) { notify(error instanceof Error ? error.message : "Research could not be completed."); }
    finally { setLoading(false); }
  };
  const save = async () => {
    if (!run) return;
    try {
      const dossier = await post<JsonRecord>("/api/dossiers", { run_id: run.run_id, title: `${symbol} research`, notes: "" });
      await loadDossiers(); setSavedDossier(dossier.dossier_id); notify("Research run saved to your local dossier library.");
    } catch (error) { notify(error instanceof Error ? error.message : "Could not save the dossier."); }
  };
  const compare = async () => {
    if (!run || !savedDossier) return;
    try { setComparison(await post<JsonRecord>("/api/dossiers/compare", { run_id: run.run_id, dossier_id: savedDossier })); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not compare research."); }
  };

  const network3DElement = (
    <Suspense fallback={<div className="panel loading-panel"><Loading label="Initializing 3D market topology…" /></div>}>
      <MarketNetwork3D
        position={networkPosition}
        onTogglePosition={() => setNetworkPosition((prev) => (prev === "top" ? "bottom" : "top"))}
      />
    </Suspense>
  );

  return <div className="page-stack">
    <PageHeading eyebrow="Company research" title="Follow the evidence." copy="One company per run. This local demo has a synthetic source packet for NORTHSTAR; other symbols return an explicit packet-unavailable result." />
    {networkPosition === "top" && network3DElement}
    <div className="notice notice-amber"><ShieldCheck size={17} /><div><strong>Demo packet is synthetic</strong><span>The current Northstar packet is invented for the UI and agent workflow. It contains no real company disclosures or market data.</span></div></div>
    <Panel className="research-controls"><div className="form-grid">
      <label className="field"><span>Company with a source packet</span><select value={symbol} onChange={(event) => setSymbol(event.target.value)}>{researchSymbols.map((item) => <option value={item} key={item}>{item} · {companyNames[item]}</option>)}</select></label>
      <label className="field field-wide"><span>Research question</span><input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={500} /></label>
      <div className="field-action"><Button onClick={() => void research()} disabled={loading} icon={loading ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />}>{loading ? "Researching…" : "Run research"}</Button></div>
    </div><div className="form-footnote"><Activity size={13} /> Five bounded roles · two specialists, independent bull/bear, constrained synthesis · citation, policy, and numeric checks</div></Panel>

    {!run && !loading && <Panel><EmptyState title="Your next research run will appear here" copy="Choose a demo security and question. The source packet, dated citations, disagreement, and unknowns will stay attached to the result." /></Panel>}
    {loading && <Panel><Loading label="Running the bounded research workflow" /><div className="workflow-steps"><span className="done">Resolve company</span><span className="done">Validate source packet</span><span className="active">Independent analysis</span><span>Synthesize & check citations</span></div></Panel>}
    {run && <div className="research-result">
      <Panel className="result-hero"><div className="result-hero-top"><div><div className="eyebrow">Research dossier · {run.instrument_id}</div><h2>{run.company_name}</h2><span className="result-meta">Run {run.run_id.slice(0, 16)} · completed {prettyDate(run.completed_at)}</span></div><DataBadge tone="amber">Synthetic fixture</DataBadge></div><div className="notice notice-amber compact"><ShieldCheck size={16} /><div><strong>Illustrative only</strong><span>{run.disclaimer}</span></div></div>
        <div className="result-two-col"><div className="thesis-card positive"><span className="micro-label">The supported case</span><p>{run.supported_case?.[0]}</p></div><div className="thesis-card caution"><span className="micro-label">The countercase</span><p>{run.countercase?.[0]}</p></div></div>
        <div className="insight-row"><div><span className="micro-label">Where the analyses disagree</span><p>{run.disagreements?.join(" ")}</p></div><div><span className="micro-label">What remains unknown</span><ul>{(run.unknowns ?? []).map((item: string) => <li key={item}>{item}</li>)}</ul></div></div>
        {run.model_usage && <div className="inline-hint">Sarvam usage · {run.model_usage.requests} requests · {Number(run.model_usage.prompt_tokens).toLocaleString()} input / {Number(run.model_usage.completion_tokens).toLocaleString()} output tokens</div>}
        <div className="result-actions"><Button variant="secondary" onClick={() => void save()} icon={<Plus size={15} />}>Save dossier</Button>{dossiers.length > 0 && <div className="inline-form"><select aria-label="Choose a dossier for comparison" value={savedDossier} onChange={(event) => setSavedDossier(event.target.value)}><option value="">Compare with saved dossier…</option>{dossiers.map((dossier) => <option key={dossier.dossier_id} value={dossier.dossier_id}>{dossier.title} · v{dossier.version}</option>)}</select><Button variant="secondary" onClick={() => void compare()} disabled={!savedDossier}>Compare</Button></div>}</div>
      </Panel>
      {comparison && <Panel><SectionHeading title="Source changes since dossier" detail={comparison.change_summary} /><div className="compare-grid"><CompareCount label="New sources" count={comparison.new_sources?.length ?? 0} tone="green" /><CompareCount label="Unchanged" count={comparison.unchanged_sources?.length ?? 0} tone="gray" /><CompareCount label="No longer present" count={comparison.removed_sources?.length ?? 0} tone="amber" /></div></Panel>}
      <Panel><SectionHeading title="Evidence packet" detail={`${run.source_packet.length} dated source records · content hashes retained`} />
        <div className="source-list">{run.source_packet.map((source: JsonRecord) => <article className="source-card" key={source.source_id}><div className="source-top"><div className="source-icon"><FileText size={16} /></div><div className="source-title"><strong>{source.title}</strong><span>{source.publisher} · published {prettyDate(source.published_at)} · retrieved {prettyDate(source.retrieved_at)}</span></div><span className="source-type">{source.source_type.replaceAll("_", " ")}</span></div><div className="source-excerpts">{source.excerpts.map((excerpt: JsonRecord) => <p key={excerpt.excerpt_id}><span>{excerpt.excerpt_id}</span>{excerpt.text}</p>)}</div><div className="source-foot"><span>Source ID: {source.source_id}</span><span>Hash: {source.content_hash}</span></div></article>)}</div>
      </Panel>
      <Panel><SectionHeading title="Agent work trace" detail="First drafts of the bull and bear analyses are produced independently." /><div className="agent-grid">{run.analyses.map((analysis: JsonRecord) => <details className="agent-card" key={analysis.role}><summary><span className="agent-symbol">{analysis.role === "bull_case" ? "+" : analysis.role === "bear_case" ? "−" : "•"}</span><span><strong>{analysis.role.replaceAll("_", " ")}</strong><small>{analysis.claim_ids?.length ?? 0} cited excerpts</small></span><ChevronDown size={15} /></summary><p>{analysis.summary}</p>{analysis.counterpoints?.map((item: string) => <span className="agent-line" key={item}>Counterpoint · {item}</span>)}{analysis.open_questions?.map((item: string) => <span className="agent-line" key={item}>Open question · {item}</span>)}</details>)}</div></Panel>
    </div>}
    {networkPosition === "bottom" && network3DElement}
  </div>;
}

function CompareCount({ label, count, tone }: { label: string; count: number; tone: string }) {
  return <div className={`compare-count ${tone}`}><span>{label}</span><strong>{count}</strong></div>;
}

function DiscoveryPage({ notify }: { notify: (message: string) => void }) {
  const [field, setField] = useState("sector");
  const [operator, setOperator] = useState("eq");
  const [value, setValue] = useState("Industrials");
  const [result, setResult] = useState<JsonRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const isTextField = field === "sector";
  const runScreen = async () => {
    setLoading(true);
    try {
      const typed = isTextField ? value : Number(value);
      setResult(await post<JsonRecord>("/api/screens", { universe_id: "demo-nse-equities-v1", criteria: [{ field, operator, value: typed }] }));
    } catch (error) { notify(error instanceof Error ? error.message : "The screen could not run."); }
    finally { setLoading(false); }
  };
  return <div className="page-stack">
    <PageHeading eyebrow="Research & discovery" title="Screen with criteria you can see." copy="Choose the universe, field, operator, and value. Matching is deterministic; the model does not rank or select securities." />
    <div className="notice notice-amber"><CircleHelp size={17} /><div><strong>Fictional universe · not market data</strong><span>All four securities and every metric are synthetic fixtures. No result should be used to make an investment decision.</span></div></div>
    <Panel><SectionHeading title="Build a screen" detail="All criteria apply as an AND. Missing fields are reported, not filled in." />
      <div className="screen-builder"><div className="universe-select"><span className="micro-label">Universe</span><strong><Compass size={16} /> Demo NSE & BSE equities <small>v2026-10-demo-1</small></strong></div><div className="criteria-row"><div className="criteria-label"><span className="criteria-index">01</span><span>Match securities where</span></div><select value={field} onChange={(event) => { const next = event.target.value; setField(next); setValue(next === "sector" ? "Industrials" : "10"); setOperator(next === "sector" ? "eq" : "gt"); }} aria-label="Criterion field"><option value="sector">Sector</option><option value="revenue_growth_pct">Revenue growth (%)</option><option value="debt_to_equity">Debt to equity</option><option value="market_cap_minor">Market cap (INR paise)</option></select><select value={operator} onChange={(event) => setOperator(event.target.value)} aria-label="Criterion operator">{(isTextField ? ["eq", "neq", "contains"] : ["gt", "gte", "lt", "lte", "eq"]).map((item) => <option key={item} value={item}>{({ eq: "is", neq: "is not", contains: "contains", gt: "greater than", gte: "at least", lt: "less than", lte: "at most" } as Record<string, string>)[item]}</option>)}</select><input value={value} onChange={(event) => setValue(event.target.value)} aria-label="Criterion value" />{!isTextField && <span className="unit-label">{field === "market_cap_minor" ? "paise" : field === "revenue_growth_pct" ? "%" : "ratio"}</span>}</div><div className="screen-foot"><span><ShieldCheck size={14} /> Explicit criteria · deterministic evaluation</span><Button onClick={() => void runScreen()} disabled={loading} icon={loading ? <LoaderCircle className="spin" size={15} /> : <Search size={15} />}>{loading ? "Screening…" : "Run screen"}</Button></div></div>
    </Panel>
    {result && <Panel><SectionHeading title={`${result.matched.length} matches`} detail={`Universe snapshot ${result.universe_version} · ${prettyDate(result.as_of)}`} action={<DataBadge tone="amber">Fictional fixture</DataBadge>} />
      {result.matched.length ? <div className="screen-results">{result.matched.map((item: JsonRecord) => <div className="screen-result" key={item.symbol}><div className="screen-company"><div className="company-monogram">{item.symbol.slice(0, 1)}</div><div><strong>{item.symbol}</strong><span>{item.company_name}</span></div></div><span className="sector-pill">{item.sector}</span><span className="screen-data">Growth {item.revenue_growth_pct}%</span><span className="screen-data">Debt/equity {item.debt_to_equity}</span><span className="match-mark"><Check size={14} /> Match</span></div>)}</div> : <EmptyState title="No securities matched" copy="Try changing the criterion. The demo universe has only four fictional securities." />}
      {result.excluded.length > 0 && <details className="excluded-details"><summary>View {result.excluded.length} excluded securities</summary>{result.excluded.map((item: JsonRecord) => <div key={item.symbol}>{item.symbol} · {item.match_reasons.join("; ")}</div>)}</details>}
    </Panel>}
    {!result && <Panel><EmptyState title="No screen has run" copy="Set at least one visible criterion. The result will show the selected universe version and data mode." /></Panel>}
  </div>;
}

function MonitoringPage({ notify }: { notify: (message: string) => void }) {
  const [symbol, setSymbol] = useState("NORTHSTAR");
  const [watchlist, setWatchlist] = useState<JsonRecord[]>([]);
  const [rules, setRules] = useState<JsonRecord[]>([]);
  const [alerts, setAlerts] = useState<JsonRecord[]>([]);
  const [dossiers, setDossiers] = useState<JsonRecord[]>([]);
  const [baselineDossierId, setBaselineDossierId] = useState("");
  const [busy, setBusy] = useState(false);
  const [description, setDescription] = useState("Notify me about a material operating update");
  const baselineOptions = dossiers.filter((dossier) => dossier.instrument_id === instrumentIds[symbol] && dossier.active !== false);

  const refresh = async () => {
    const [entries, ruleRows, alertRows, dossierRows] = await Promise.all([
      api<JsonRecord[]>("/api/watchlist"), api<JsonRecord[]>("/api/alerts/rules"), api<JsonRecord[]>("/api/alerts"), api<JsonRecord[]>("/api/dossiers"),
    ]);
    setWatchlist(entries); setRules(ruleRows); setAlerts(alertRows); setDossiers(dossierRows);
    const selectedBaselineExists = dossierRows.some((dossier) => dossier.dossier_id === baselineDossierId && dossier.instrument_id === instrumentIds[symbol]);
    if (!selectedBaselineExists) setBaselineDossierId(dossierRows.find((dossier) => dossier.instrument_id === instrumentIds[symbol])?.dossier_id ?? "");
  };
  useEffect(() => { void refresh().catch((error) => notify(error.message)); }, []);

  const addRule = async () => {
    setBusy(true);
    try {
      await post("/api/alerts/rules", { instrument_id: instrumentIds[symbol], baseline_dossier_id: baselineDossierId, event_classes: ["operating_update"], threshold: 50, source_types: ["demonstration_fixture"], schedule: "manual", description });
      await refresh(); notify("Added the security and an in-app rule tied to the selected research baseline.");
    } catch (error) { notify(error instanceof Error ? error.message : "The alert rule could not be saved."); }
    finally { setBusy(false); }
  };
  const scan = async () => {
    setBusy(true);
    try { const fresh = await post<JsonRecord[]>("/api/alerts/scan", {}); await refresh(); notify(fresh.length ? `${fresh.length} new synthetic alert found.` : "No new material demo events. Existing source IDs were deduplicated."); }
    catch (error) { notify(error instanceof Error ? error.message : "The scan failed."); }
    finally { setBusy(false); }
  };

  return <div className="page-stack">
    <PageHeading eyebrow="Monitoring" title="Watch for what changes." copy="Compare a synthetic event feed with a saved research baseline, then review the source behind each alert." action={<Button variant="secondary" onClick={() => void scan()} disabled={busy} icon={busy ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}>Scan now</Button>} />
    <div className="notice notice-amber"><Bell size={17} /><div><strong>Manual scan · in-app only</strong><span>Scheduled jobs, email, and push notifications are not configured. The event feed is a synthetic fixture.</span></div></div>
    <div className="content-grid two-thirds">
      <Panel><SectionHeading title="Watchlist rules" detail="An alert rule never creates an order or suggests an action." />
        <div className="form-grid alert-form"><label className="field"><span>Demo security</span><select value={symbol} onChange={(event) => { setSymbol(event.target.value); setBaselineDossierId(""); }}>{demoSymbols.map((item) => <option key={item} value={item}>{item} · {companyNames[item]}</option>)}</select></label><label className="field"><span>Saved research baseline</span><select value={baselineDossierId} onChange={(event) => setBaselineDossierId(event.target.value)} disabled={!baselineOptions.length}><option value="">{baselineOptions.length ? "Choose a saved dossier" : "Save a dossier for this security first"}</option>{baselineOptions.map((dossier) => <option key={dossier.dossier_id} value={dossier.dossier_id}>{dossier.title} · v{dossier.version}</option>)}</select></label><label className="field field-wide"><span>Rule description</span><input value={description} onChange={(event) => setDescription(event.target.value)} /></label><div className="field-action"><Button onClick={() => void addRule()} disabled={busy || !baselineDossierId} icon={<Plus size={15} />}>Add rule</Button></div></div>
        <div className="monitor-list-title"><span>Active watchlist</span><span>{watchlist.length} securities · {rules.length} rules</span></div>
        {watchlist.length ? <div className="watchlist-list">{watchlist.map((entry) => <div className="watchlist-row" key={entry.entry_id}><div className="watch-icon"><Activity size={15} /></div><div className="watch-copy"><strong>{entry.instrument_id.split(":")[1]}</strong><span>{entry.company_name}</span></div><DataBadge tone="green">In-app</DataBadge><button className="icon-button danger-icon" aria-label={`Remove ${entry.company_name}`} onClick={async () => { try { await remove(`/api/watchlist/${entry.entry_id}`); await refresh(); } catch (error) { notify(error instanceof Error ? error.message : "Could not remove item."); } }}><X size={15} /></button></div>)}</div> : <EmptyState title="Your watchlist is empty" copy="Add one fictional demo security to configure an in-app alert rule." />}
      </Panel>
      <Panel><SectionHeading title="Delivery preferences" detail="Current channel is local in-app only." /><div className="delivery-option enabled"><div className="delivery-icon"><Bell size={16} /></div><div><strong>In-app alerts</strong><span>Shown in this workspace · active</span></div><Check size={16} className="green-check" /></div><div className="delivery-option disabled"><div className="delivery-icon"><Activity size={16} /></div><div><strong>Email and push</strong><span>Provider and verified destination required</span></div><span className="disabled-tag">Unavailable</span></div><Button variant="secondary" onClick={async () => { try { await post("/api/alerts/preferences", { channels: ["in_app"], opted_in: false }); notify("In-app-only delivery preference saved."); } catch (error) { notify(error instanceof Error ? error.message : "Could not save preferences."); } }}>Save in-app preference</Button></Panel>
    </div>
    <Panel><SectionHeading title="Event alerts" detail="Each alert retains its source ID and materiality reason." action={<Button variant="secondary" onClick={() => void refresh()} icon={<RefreshCw size={14} />}>Refresh</Button>} />
      {alerts.length ? <div className="alert-list">{alerts.map((alert) => <article className={`alert-row ${alert.read ? "read" : ""}`} key={alert.alert_id}><div className="alert-indicator"><Bell size={15} /></div><div className="alert-body"><div className="alert-title-row"><strong>{alert.instrument_id.split(":")[1]} · material event</strong><span>{prettyDate(alert.detected_at)}</span></div><p>{alert.reason}</p><div className="alert-meta"><DataBadge tone="amber">Synthetic event</DataBadge><span>Source: {alert.source_ids.join(", ")}</span><span>{alert.source_metadata?.map((source: JsonRecord) => `${source.title} · published ${prettyDate(source.published_at)}`).join("; ")}</span><span>Baseline dossier v{alert.comparison_dossier_version ?? "unknown"}</span></div></div><div className="alert-actions"><button className="text-action" onClick={async () => { try { await patch(`/api/alerts/${alert.alert_id}`, { read: !alert.read }); await refresh(); } catch (error) { notify(error instanceof Error ? error.message : "Could not update alert."); } }}>{alert.read ? "Mark unread" : "Mark read"}</button><button className="text-action" onClick={async () => { try { await post(`/api/alerts/${alert.alert_id}/deliver?channel=in_app`, {}); await refresh(); } catch (error) { notify(error instanceof Error ? error.message : "Could not deliver alert."); } }}>Show in app</button><button className="text-action subtle-action" onClick={async () => { try { await patch(`/api/alerts/${alert.alert_id}`, { dismissed: true, read: true }); await refresh(); } catch (error) { notify(error instanceof Error ? error.message : "Could not dismiss alert."); } }}>Dismiss</button></div></article>)}</div> : <EmptyState title="No alerts yet" copy="Save a research dossier, add a rule against it, then scan the synthetic event packet." />}
    </Panel>
  </div>;
}

function OrdersPage({ notify, initialSymbol }: { notify: (message: string) => void; initialSymbol: string }) {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [side, setSide] = useState("");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [accountAlias, setAccountAlias] = useState("");
  const [accounts, setAccounts] = useState<JsonRecord[]>([]);
  const [upstoxReady, setUpstoxReady] = useState(false);
  const [upstoxMappingReady, setUpstoxMappingReady] = useState(false);
  const [orders, setOrders] = useState<JsonRecord[]>([]);
  const [preview, setPreview] = useState<JsonRecord | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [editingOrder, setEditingOrder] = useState<JsonRecord | null>(null);
  const [changePreview, setChangePreview] = useState<JsonRecord | null>(null);
  const [changeTerms, setChangeTerms] = useState({ quantity: "", limit_price: "" });
  const [changeConfirmed, setChangeConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const voiceRecognition = useRef<SpeechRecognition | null>(null);
  const exchange = symbol ? (symbol === "CEDARTECH" ? "BSE" : "NSE") : "";
  const canPreview = Boolean(symbol && side && Number.isInteger(Number(quantity)) && Number(quantity) > 0 && Number(price) > 0 && accountAlias);

  const refresh = async () => {
    const [accountRows, orderRows, health] = await Promise.all([api<JsonRecord[]>("/api/accounts"), api<JsonRecord[]>("/api/orders"), api<JsonRecord>("/api/health")]);
    const availableAccounts = accountRows.filter((account) => account.status !== "revoked");
    setAccounts(availableAccounts); setOrders(orderRows);
    setUpstoxReady(Boolean(health.providers?.upstox_sandbox));
    setUpstoxMappingReady(Boolean(health.capabilities?.upstox_instrument_mapping));
    if (!availableAccounts.find((account) => account.alias === accountAlias)) setAccountAlias("");
  };
  useEffect(() => { void refresh().catch((error) => notify(error.message)); }, []);
  useEffect(() => { setSymbol(initialSymbol); }, [initialSymbol]);
  useEffect(() => () => voiceRecognition.current?.stop(), []);

  const startVoiceOrder = () => {
    if (voiceListening) {
      voiceRecognition.current?.stop();
      setVoiceListening(false);
      return;
    }
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) {
      notify("Speech recognition is not available in this browser. You can enter the terms below.");
      return;
    }
    setSymbol(""); setSide(""); setQuantity(""); setPrice(""); setAccountAlias(""); setVoiceTranscript("");
    const instance = new Constructor();
    instance.lang = "en-IN";
    instance.continuous = false;
    instance.interimResults = false;
    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim() ?? "";
      if (!transcript) return;
      setVoiceTranscript(transcript);
      const normalized = transcript.toUpperCase().replace(/[^A-Z0-9., ]/g, " ").replace(/\s+/g, " ").trim();
      let filled: string[] = [];
      const compact = normalized.replace(/[^A-Z0-9]/g, "");
      const matchedSymbol = demoSymbols.find((item) => compact.includes(item) || compact.includes(companyNames[item].toUpperCase().replace(/[^A-Z0-9]/g, "")));
      if (matchedSymbol) { setSymbol(matchedSymbol); filled.push("security"); }
      const spokenSide = /\b(SELL|SELLING|SOLD)\b/.test(normalized) ? "SELL" : /\b(BUY|BUYING|PURCHASE)\b/.test(normalized) ? "BUY" : null;
      if (spokenSide) { setSide(spokenSide); filled.push("side"); }
      const quantityMatch = normalized.match(/\b(?:BUY|SELL|BUYING|SELLING|PURCHASE)\s+(\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\b/) ?? normalized.match(/\b(\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)\s+(?:SHARES?|STOCKS?)\b/);
      const quantityValue = quantityMatch?.[1] ? Number(quantityMatch[1]) || spokenQuantities[quantityMatch[1]] : undefined;
      if (quantityValue) { setQuantity(String(quantityValue)); filled.push("quantity"); }
      const priceMatch = normalized.match(/\b(?:AT|LIMIT(?: PRICE)?|PRICE(?: OF)?)\s+(?:(?:INR|RS|RUPEES?)\s*)?([\d,]+(?:\.\d{1,2})?)/);
      if (priceMatch?.[1]) { setPrice(priceMatch[1].replaceAll(",", "")); filled.push("limit price"); }
      const matchedAccount = accounts.find((account) => normalized.includes(String(account.alias).toUpperCase()));
      if (matchedAccount) { setAccountAlias(matchedAccount.alias); filled.push("account"); }
      notify(filled.length ? `I filled ${filled.join(", ")}. Review every field, then create a preview; nothing has been submitted.` : "I heard you, but couldn’t match explicit order terms. Enter or repeat the security, side, quantity, and limit price.");
    };
    instance.onerror = () => { setVoiceListening(false); notify("Speech input stopped. You can enter the terms below."); };
    instance.onend = () => setVoiceListening(false);
    voiceRecognition.current = instance;
    try { instance.start(); setVoiceListening(true); }
    catch { setVoiceListening(false); notify("Could not start the microphone. Check browser permission and try again."); }
  };

  const makePreview = async () => {
    if (!canPreview) { notify("Choose the security, side, quantity, limit price, and account before creating a preview."); return; }
    setBusy(true); setConfirmed(false);
    try { setPreview(await post<JsonRecord>("/api/orders/preview", { symbol, exchange, side, quantity: Number(quantity), limit_price: price, account_alias: accountAlias })); setChangePreview(null); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not create order preview."); }
    finally { setBusy(false); }
  };
  const confirmOrder = async () => {
    if (!preview || !confirmed) return;
    setBusy(true);
    let order: JsonRecord | undefined;
    try {
      const { confirmation_token } = await post<{ confirmation_token: string }>(`/api/orders/${preview.preview_id}/confirmation-token`, { explicit_confirmation: true });
      order = await post<JsonRecord>(`/api/orders/${preview.preview_id}/confirm`, { explicit_confirmation: true, confirmation_token, idempotency_key: crypto.randomUUID() });
    } catch (error) { notify(error instanceof Error ? error.message : "The paper order was not confirmed."); return; }
    finally { setBusy(false); }
    if (!order) return;
    setPreview(null); setConfirmed(false);
    notify(order.mode === "sandbox" ? `Upstox sandbox status: ${String(order.status).replaceAll("_", " ")}. No live brokerage order was sent.` : "Local paper order accepted. No brokerage or exchange order was sent.");
    try { await refresh(); } catch { notify("The order result was recorded, but the history refresh failed. Refresh the page to reload it."); }
  };
  const makeChangePreview = async (order: JsonRecord, action: "modify" | "cancel") => {
    const body = action === "modify" ? { action, quantity: Number(changeTerms.quantity || order.quantity), limit_price: changeTerms.limit_price || String(order.limit_price) } : { action };
    setBusy(true); setChangeConfirmed(false);
    try { setChangePreview(await post<JsonRecord>(`/api/orders/${order.order_id}/changes`, body)); setEditingOrder(null); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not preview the order change."); }
    finally { setBusy(false); }
  };
  const startOrderEdit = (order: JsonRecord) => {
    setChangeTerms({ quantity: String(order.quantity), limit_price: String(order.limit_price) });
    setChangePreview(null); setChangeConfirmed(false); setEditingOrder(order);
  };
  const confirmChange = async () => {
    if (!changePreview || !changeConfirmed) return;
    setBusy(true);
    try {
      const { confirmation_token } = await post<{ confirmation_token: string }>(`/api/order-changes/${changePreview.change_id}/confirmation-token`, { explicit_confirmation: true });
      await post(`/api/order-changes/${changePreview.change_id}/confirm`, { explicit_confirmation: true, confirmation_token, idempotency_key: crypto.randomUUID() });
      setChangePreview(null); setChangeConfirmed(false); notify("Local paper-order change recorded.");
      try { await refresh(); } catch { notify("The change was recorded, but the history refresh failed. Refresh the page to reload it."); }
    } catch (error) { notify(error instanceof Error ? error.message : "Order change was not confirmed."); }
    finally { setBusy(false); }
  };

  return <div className="page-stack trade-page">
    <PageHeading eyebrow="Trade · paper simulation" title="Say the terms. Review them. Then confirm." copy="Use voice or touch to prepare a ticket. Every order is previewed first and remains a simulation; no live brokerage order is sent." />
    <div className="notice notice-amber"><ShieldCheck size={17} /><div><strong>{upstoxReady && upstoxMappingReady ? "Local paper and Upstox sandbox modes" : "Local paper mode · no real money"}</strong><span>{upstoxReady && upstoxMappingReady ? "Upstox sandbox is configured for mapped instruments; it cannot reach a live brokerage account." : upstoxReady ? "Sandbox credentials are present, but no demo security has a verified Upstox instrument key. Orders remain local." : "Nothing is sent to Upstox, a brokerage, or an exchange. Sandbox stays disabled until credentials, exact endpoint behavior, and instrument mapping are verified."}</span></div></div>
    <Panel className={`trade-voice-panel ${voiceListening ? "is-listening" : ""}`}>
      <div className="trade-voice-copy"><span className="trade-voice-orb"><Mic size={21} /></span><div><div className="eyebrow">Voice order entry</div><strong>{voiceListening ? "Listening for order terms…" : "Tell me the order you want to rehearse."}</strong><p>For example: “Buy 2 NORTHSTAR shares at 1500 rupees in Sample Account A.” Speech fills the ticket only; it never creates a preview or submits an order.</p>{voiceTranscript && <div className="voice-transcript"><span>Heard</span> “{voiceTranscript}”</div>}</div></div>
      <Button variant="secondary" onClick={startVoiceOrder} disabled={busy} icon={voiceListening ? <MicOff size={17} /> : <Mic size={17} />}>{voiceListening ? "Stop listening" : "Speak order"}</Button>
    </Panel>
    <div className="content-grid two-thirds">
      <Panel><SectionHeading title="Create order preview" detail="Enter all terms yourself. Market Partner will not choose a security, side, size, or price." />
        <div className="form-grid order-form"><label className="field"><span>Security</span><select value={symbol} onChange={(event) => setSymbol(event.target.value)}><option value="">Choose a demo stock</option>{demoSymbols.map((item) => <option key={item} value={item}>{item} · {demoSectors[item]}</option>)}</select></label><label className="field"><span>Exchange</span><input value={exchange} placeholder="Selected automatically" readOnly /></label><label className="field"><span>Side</span><select value={side} onChange={(event) => setSide(event.target.value)}><option value="">Choose side</option><option value="BUY">Buy</option><option value="SELL">Sell</option></select></label><label className="field"><span>Whole-share quantity</span><input type="number" min="1" step="1" placeholder="Enter quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label className="field"><span>Your limit price (₹)</span><input type="number" min="0.01" step="0.01" placeholder="Enter limit price" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label className="field"><span>Sample account</span><select value={accountAlias} onChange={(event) => setAccountAlias(event.target.value)}><option value="">Choose sample account</option>{accounts.map((account) => <option key={account.account_ref} value={account.alias}>{account.alias} · {account.mode}</option>)}</select></label></div>
        <div className="order-bottom"><span><ShieldCheck size={14} /> All order terms must be explicit</span><Button onClick={() => void makePreview()} disabled={busy || !canPreview} icon={<ArrowRight size={15} />}>Review exact terms</Button></div>
      </Panel>
      <Panel><SectionHeading title="Order guardrails" detail="Confirmation must be a separate action." /><div className="guardrail-list"><Guardrail title="Immutable terms" copy="Any change to security, side, quantity, account, or limit price requires a new preview." /><Guardrail title="Five-minute expiry" copy="Expired previews cannot be confirmed. Start again with current terms." /><Guardrail title="No automatic retries" copy="The local simulator records an outcome; a real provider would require reconciliation." /><Guardrail title="No action advice" copy="The exposure scenario is descriptive and does not mean the order is suitable." /></div></Panel>
    </div>
    {preview && <Panel className="order-preview"><div className="preview-header"><div><div className="eyebrow">Review carefully · expires {prettyDate(preview.expires_at)}</div><h2>{preview.side} {preview.quantity} {preview.symbol ?? preview.instrument_id.split(":")[1]}</h2></div><DataBadge tone="amber">{preview.mode === "sandbox" ? "Upstox sandbox" : "Local paper only"}</DataBadge></div><div className="preview-details"><PreviewValue label="Limit price" value={money(Math.round(Number(preview.limit_price) * 100))} /><PreviewValue label="Estimated notional" value={money(preview.estimated_value_minor)} /><PreviewValue label="Account" value={preview.account_alias} /><PreviewValue label="Mode" value={preview.mode === "sandbox" ? "Upstox sandbox" : "Local simulator"} /></div><div className="hypothetical-box"><div><span className="micro-label">Hypothetical invested holdings exposure</span><p>Current {money(preview.current_exposure_minor)} <ArrowRight size={13} /> After scenario {money(preview.hypothetical_exposure_minor)}</p></div><strong>{preview.exposure_percent == null ? "Unavailable" : `${preview.exposure_percent}%`}</strong></div><div className="confirm-row"><label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I reviewed these exact terms and confirm this {preview.mode === "sandbox" ? "sandbox" : "local paper"} simulation.</span></label><Button onClick={() => void confirmOrder()} disabled={!confirmed || busy} icon={<Check size={15} />}>Confirm paper order</Button></div><div className="preview-warning"><ShieldCheck size={14} />{preview.warning}</div></Panel>}
    {editingOrder && <Panel className="change-preview"><div className="preview-header"><div><div className="eyebrow">Order change draft · no change has been applied</div><h2>Modify {editingOrder.instrument_id.split(":")[1]}</h2></div><DataBadge tone="amber">Local paper only</DataBadge></div><p>Current terms: {editingOrder.quantity} shares at ₹{editingOrder.limit_price}.</p><div className="form-grid order-form"><label className="field"><span>New whole-share quantity</span><input type="number" min="1" step="1" value={changeTerms.quantity} onChange={(event) => setChangeTerms((terms) => ({ ...terms, quantity: event.target.value }))} /></label><label className="field"><span>New limit price (₹)</span><input type="number" min="0.01" step="0.01" value={changeTerms.limit_price} onChange={(event) => setChangeTerms((terms) => ({ ...terms, limit_price: event.target.value }))} /></label></div><div className="order-bottom"><Button variant="secondary" onClick={() => setEditingOrder(null)}>Discard</Button><Button onClick={() => void makeChangePreview(editingOrder, "modify")} disabled={busy}>Review modification</Button></div></Panel>}
    {changePreview && <Panel className="change-preview"><div className="preview-header"><div><div className="eyebrow">Separate confirmation required · expires {prettyDate(changePreview.expires_at)}</div><h2>{changePreview.action === "cancel" ? "Cancel paper order?" : "Modify paper order?"}</h2></div><DataBadge tone="amber">Local paper only</DataBadge></div><p>{changePreview.action === "cancel" ? `Cancel ${changePreview.terms.quantity} shares at ₹${changePreview.terms.limit_price} in the local simulator.` : `Before: ${changePreview.terms.from_quantity} shares at ₹${changePreview.terms.from_limit_price}. After: ${changePreview.terms.quantity} shares at ₹${changePreview.terms.limit_price}.`}</p><div className="confirm-row"><label className="checkbox-label"><input type="checkbox" checked={changeConfirmed} onChange={(event) => setChangeConfirmed(event.target.checked)} /><span>I confirm this exact change to the local paper order.</span></label><Button variant={changePreview.action === "cancel" ? "danger" : "primary"} onClick={() => void confirmChange()} disabled={!changeConfirmed || busy}>Confirm {changePreview.action}</Button></div></Panel>}
    <Panel><SectionHeading title="Paper-order history" detail="Local simulation and verified sandbox status; live brokerage orders are unavailable." action={<Button variant="secondary" onClick={() => void refresh()} icon={<RefreshCw size={14} />}>Refresh status</Button>} />
      {orders.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Security</th>
                <th>Side / Quantity</th>
                <th style={{ textAlign: "right" }}>Limit Price</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Last Checked</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id}>
                  <td>
                    <div className="table-primary">{order.instrument_id.split(":")[1]}</div>
                    <div className="table-secondary">
                      {order.mode === "sandbox" ? `Upstox sandbox · ${order.provider_order_id ?? "reconciliation pending"}` : "Local simulation · no exchange order"}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span className={`data-badge ${order.side === "BUY" ? "badge-green" : "badge-amber"}`}>
                        {order.side}
                      </span>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        {order.quantity}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, textAlign: "right" }}>
                    {money(Math.round(Number(order.limit_price) * 100))}
                  </td>
                  <td>
                    <DataBadge tone={order.status.includes("CANCELLED") ? "gray" : order.status.includes("UNKNOWN") ? "amber" : "green"}>
                      {order.status.replaceAll("_", " ")}
                    </DataBadge>
                  </td>
                  <td style={{ textAlign: "right" }}>{prettyDate(order.status_as_of)}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className="table-action-group" style={{ justifyContent: "flex-end" }}>
                      <button
                        className="text-action"
                        onClick={async () => {
                          try {
                            const status = await api<JsonRecord>(`/api/orders/${order.order_id}/status?refresh=true`);
                            notify(`Status: ${status.status} · ${status.mode}`);
                            await refresh();
                          } catch (error) {
                            notify(error instanceof Error ? error.message : "Status unavailable.");
                          }
                        }}
                      >
                        Status
                      </button>
                      {["ACCEPTED_SIMULATED", "OPEN_SIMULATED"].includes(order.status) && (
                        <>
                          <button className="text-action" onClick={() => startOrderEdit(order)}>
                            Modify
                          </button>
                          <button className="text-action subtle-action" onClick={() => void makeChangePreview(order, "cancel")}>
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No paper orders yet" copy="Create and review a preview. It will only enter this local simulator after your separate confirmation." />
      )}
    </Panel>
  </div>;
}

function Guardrail({ title, copy }: { title: string; copy: string }) {
  return <div className="guardrail"><span className="guardrail-check"><Check size={13} /></span><div><strong>{title}</strong><span>{copy}</span></div></div>;
}

function PreviewValue({ label, value }: { label: string; value: string }) {
  return <div className="preview-value"><span>{label}</span><strong>{value}</strong></div>;
}

function ConnectionsPage({ notify }: { notify: (message: string) => void }) {
  const [accounts, setAccounts] = useState<JsonRecord[]>([]);
  const [providerState, setProviderState] = useState<JsonRecord>({});
  const [provider, setProvider] = useState("Sample provider");
  const [alias, setAlias] = useState("Sample Account C");
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    const [accountRows, health] = await Promise.all([api<JsonRecord[]>("/api/accounts"), api<JsonRecord>("/api/health")]);
    setAccounts(accountRows); setProviderState(health.providers ?? {});
  };
  useEffect(() => { void refresh().catch((error) => notify(error.message)); }, []);
  const add = async () => {
    setBusy(true);
    try { await post("/api/accounts", { provider_name: provider, alias, mode: "fixture" }); await refresh(); notify("A simulated sample link was added. No brokerage account was connected."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not add sample link."); }
    finally { setBusy(false); }
  };
  const revoke = async (accountRef: string) => {
    try { await remove(`/api/accounts/${accountRef}`); await refresh(); notify("Sample link revoked. Holdings from that account are no longer included."); }
    catch (error) { notify(error instanceof Error ? error.message : "Could not revoke sample link."); }
  };
  return <div className="page-stack">
    <PageHeading eyebrow="Connections & permissions" title="You control what is connected." copy="Manage sample account links here. Real provider linking remains off until identity, OAuth, consent, and credential storage are ready." />
    <div className="notice notice-amber"><ShieldCheck size={17} /><div><strong>Real brokerage access is disabled</strong><span>This screen only creates or revokes local simulated links. It never handles an OAuth code or real account credential.</span></div></div>
    <div className="content-grid two-thirds">
      <Panel><SectionHeading title="Account links" detail="Provider accounts are masked; sample rows contain no account numbers." />
        <div className="connection-list">{accounts.map((account) => <div className="connection-row" key={account.account_ref}><div className="connection-provider"><div className="provider-mark"><Link2 size={17} /></div><div><strong>{account.alias}</strong><span>{account.provider_name}</span></div></div><div className="connection-scopes"><span>read:holdings</span><span>read:activities</span></div><DataBadge tone={account.status === "revoked" ? "gray" : "amber"}>{account.status === "revoked" ? "Revoked" : "Simulated"}</DataBadge>{account.status !== "revoked" && <button className="text-action subtle-action" onClick={() => void revoke(account.account_ref)}>Revoke</button>}</div>)}</div>
      </Panel>
      <Panel><SectionHeading title="Add a sample link" detail="Local demo record only" /><div className="form-stack"><label className="field"><span>Provider label</span><input value={provider} onChange={(event) => setProvider(event.target.value)} /></label><label className="field"><span>Account alias</span><input value={alias} onChange={(event) => setAlias(event.target.value)} /></label><Button onClick={() => void add()} disabled={busy} icon={<Plus size={15} />}>Add simulated account</Button></div><div className="inline-hint">A sample link has no OAuth token, provider account ID, or live portfolio permissions.</div></Panel>
    </div>
      <Panel><SectionHeading title="Provider readiness" detail="Model credentials stay on the local server; brokerage and order integrations remain separately gated." /><div className="provider-readiness"><ProviderStatus name="Sarvam AI" detail="Conversation and multi-agent research" ready={Boolean(providerState.sarvam)} /><ProviderStatus name="Amazon Bedrock" detail="Optional model provider" ready={Boolean(providerState.bedrock)} /><ProviderStatus name="Upstox sandbox" detail="Order submission and status only" ready={Boolean(providerState.upstox_sandbox)} /><ProviderStatus name="SnapTrade" detail="Authorized read-only account data" ready={Boolean(providerState.snaptrade)} /><ProviderStatus name="Email / push" detail="Opt-in alert delivery" ready={false} /></div></Panel>
  </div>;
}

function ProviderStatus({ name, detail, ready }: { name: string; detail: string; ready: boolean }) {
  return <div className="provider-status"><div><strong>{name}</strong><span>{detail}</span></div><DataBadge tone={ready ? "green" : "gray"}>{ready ? "Connected" : "Not configured"}</DataBadge></div>;
}

export default App;
