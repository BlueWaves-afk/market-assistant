import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowRight,
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  CircleHelp,
  Compass,
  FileText,
  Gauge,
  Link2,
  LoaderCircle,
  Mic,
  MicOff,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Volume2,
  VolumeX,
  WalletCards,
  X,
} from "lucide-react";
import { api, money, patch, post, prettyDate, remove } from "./lib/api";
import type { JsonRecord } from "./lib/api";

type Page = "assistant" | "portfolio" | "research" | "discovery" | "monitoring" | "orders" | "connections";
type Message = { role: "user" | "assistant"; content: string; data?: JsonRecord | null; tool_calls?: JsonRecord[] };

const nav: { id: Page; label: string; icon: typeof Sparkles; group: string }[] = [
  { id: "assistant", label: "Assistant", icon: Sparkles, group: "Workspace" },
  { id: "portfolio", label: "Portfolio", icon: BriefcaseBusiness, group: "Workspace" },
  { id: "research", label: "Research", icon: BookOpenCheck, group: "Workspace" },
  { id: "discovery", label: "Discovery", icon: Compass, group: "Tools" },
  { id: "monitoring", label: "Monitoring", icon: Bell, group: "Tools" },
  { id: "orders", label: "Paper orders", icon: WalletCards, group: "Tools" },
  { id: "connections", label: "Connections", icon: Link2, group: "Settings" },
];

const demoSymbols = ["NORTHSTAR", "RIVERSTONE", "CEDARTECH", "MAPLEBIO"];
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

function App() {
  const [page, setPage] = useState<Page>("assistant");
  const [health, setHealth] = useState<JsonRecord | null>(null);
  const [mcpState, setMcpState] = useState<JsonRecord | null>(null);
  const [toast, setToast] = useState("");

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
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark"><Activity size={18} strokeWidth={2.5} /></div>
          <div>
            <div className="brand-name">market partner</div>
            <div className="brand-caption">evidence before action</div>
          </div>
        </div>
        <div className="workspace-switcher">
          <div className="avatar">TM</div>
          <div className="workspace-copy"><strong>Tom’s workspace</strong><span>Local demo</span></div>
          <ChevronDown size={15} className="muted" />
        </div>
        {(["Workspace", "Tools", "Settings"] as const).map((group) => (
          <div className="nav-group" key={group}>
            <div className="nav-group-label">{group}</div>
            {nav.filter((item) => item.group === group).map(({ id, label, icon: Icon }) => (
              <button className={`nav-item ${page === id ? "active" : ""}`} key={id} onClick={() => setPage(id)}>
                <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
                {id === "monitoring" && <span className="nav-dot" aria-label="New alerts" />}
              </button>
            ))}
          </div>
        ))}
        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <div className="status-row"><span className={`status-led ${health?.status === "ok" ? "online" : ""}`} /><span>{health?.status === "ok" ? "Local service connected" : "Connecting to service"}</span></div>
            <div className="status-meta">{mcpState?.connected ? `MCP ${mcpState.protocol_version ?? "connected"}` : "MCP checking"}</div>
          </div>
          <button className="help-link" onClick={() => notify("Market Partner is a local demo with synthetic data. Provider access is disabled until configured.")}><CircleHelp size={16} /> Help & data notes</button>
          <div className="profile-row"><div className="avatar avatar-small">TM</div><div className="workspace-copy"><strong>Tom Mathew</strong><span>Demo investor</span></div><ChevronDown size={15} /></div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><ArrowRight size={13} /><strong>{title}</strong></div>
          <div className="topbar-actions">
            <span className="env-pill"><span className="status-led online" /> Sample workspace</span>
            <span className="demo-warning"><ShieldCheck size={14} /> Synthetic demo data</span>
          </div>
        </header>
        <div className="page-content">
          {page === "assistant" && <AssistantPage notify={notify} />}
          {page === "portfolio" && <PortfolioPage notify={notify} />}
          {page === "research" && <ResearchPage notify={notify} />}
          {page === "discovery" && <DiscoveryPage notify={notify} />}
          {page === "monitoring" && <MonitoringPage notify={notify} />}
          {page === "orders" && <OrdersPage notify={notify} />}
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

function AssistantPage({ notify }: { notify: (message: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Good morning, Tom. What would you like to examine? I can work through the sample portfolio, research a demo company, or screen the fictional universe. Every result keeps its sources and uncertainty visible." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(true);
  const recognition = useRef<SpeechRecognition | null>(null);

  const send = async (text = input) => {
    const message = text.trim();
    if (!message || sending) return;
    const history = messages.filter((item) => item.role === "user" || item.role === "assistant").slice(-12).map(({ role, content }) => ({ role, content }));
    setMessages((old) => [...old, { role: "user", content: message }]);
    setInput("");
    setSending(true);
    try {
      const result = await post<JsonRecord>("/api/chat", { message, history });
      const response = { role: "assistant" as const, content: result.reply, data: result.data, tool_calls: result.tool_calls };
      setMessages((old) => [...old, response]);
      if (speaking && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(result.reply));
      }
      if (result.mode === "fixture_router") notify("Answered with the local assistant. Connect Bedrock later to enable model-led conversation.");
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "The assistant could not complete that request.";
      setMessages((old) => [...old, { role: "assistant", content: errorText }]);
    } finally {
      setSending(false);
    }
  };

  const toggleMic = () => {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      return;
    }
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) {
      notify("Speech recognition is not available in this browser. You can use the text box instead.");
      return;
    }
    const instance = new Constructor();
    instance.lang = "en-IN";
    instance.continuous = false;
    instance.interimResults = false;
    instance.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInput(transcript);
    };
    instance.onerror = () => { setListening(false); notify("Speech input stopped. You can type your request instead."); };
    instance.onend = () => setListening(false);
    recognition.current = instance;
    instance.start();
    setListening(true);
  };

  return <div className="assistant-layout">
    <div className="assistant-main">
      <PageHeading eyebrow="Your research workspace" title="A clearer way to think it through." copy="Ask a question, examine the evidence, and keep the decision in your hands." />
      <div className="assistant-conversation">
        <div className="conversation-topline"><div className="assistant-avatar"><Sparkles size={17} /></div><div><strong>Market Partner</strong><span>Evidence-led assistant</span></div><div className="conversation-tools"><span className="connection-tag"><span className="status-led online" /> MCP connected</span><button className="icon-button" onClick={() => setSpeaking(!speaking)} aria-label={speaking ? "Mute voice response" : "Enable voice response"}>{speaking ? <Volume2 size={17} /> : <VolumeX size={17} />}</button></div></div>
        <div className="message-list" aria-live="polite">
          {messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}>
            {message.role === "assistant" && <div className="message-avatar"><Sparkles size={14} /></div>}
            <div className="message-content"><div className="message-bubble">{message.content}</div>
              {message.tool_calls?.length ? <div className="tool-call-note"><Radio size={12} /> MCP tool called: {message.tool_calls.map((call) => call.name).join(", ")}</div> : null}
              {message.data && <ChatResult data={message.data} />}
            </div>
          </div>)}
          {sending && <div className="message-row assistant"><div className="message-avatar"><Sparkles size={14} /></div><div className="message-bubble typing"><span /><span /><span /></div></div>}
        </div>
        <form className="composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
          <button type="button" className={`mic-button ${listening ? "listening" : ""}`} onClick={toggleMic} aria-label={listening ? "Stop speech input" : "Start speech input"}>{listening ? <MicOff size={18} /> : <Mic size={18} />}</button>
          <input value={input} onChange={(event) => setInput(event.target.value)} placeholder={listening ? "Listening…" : "Ask about a company, your sample portfolio, or a screen…"} aria-label="Ask Market Partner" />
          <button className="send-button" disabled={!input.trim() || sending} type="submit" aria-label="Send message"><Send size={17} /></button>
        </form>
        <div className="composer-foot"><span>Voice is optional. Type is always available.</span><span>Enter to send</span></div>
      </div>
      <div className="prompt-suggestions"><span className="suggestion-label">Try asking</span>{[
        "Research NORTHSTAR and show the countercase",
        "What is my NORTHSTAR exposure?",
        "Can you calculate my performance?",
      ].map((prompt) => <button key={prompt} onClick={() => void send(prompt)}>{prompt}<ArrowRight size={13} /></button>)}</div>
    </div>
    <aside className="assistant-aside">
      <div className="aside-card welcome-card"><div className="welcome-spark"><Sparkles size={20} /></div><div className="eyebrow">Built for thoughtful decisions</div><h3>See both sides.<br />Keep your agency.</h3><p>Every research run separates reported facts from interpretation, shows a countercase, and names what the evidence cannot answer.</p><div className="mini-rule" /><div className="welcome-foot"><ShieldCheck size={15} /> No buy, hold, or sell recommendations</div></div>
      <div className="aside-card"><SectionHeading title="Today’s workspace" /><div className="mini-stat"><span>Evidence mode</span><strong><span className="status-led online" /> Synthetic fixture</strong></div><div className="mini-stat"><span>Portfolio links</span><strong>2 sample accounts</strong></div><div className="mini-stat"><span>Order mode</span><strong>Local paper only</strong></div><div className="aside-note"><CircleHelp size={14} /> Nothing here represents a real portfolio or market quote.</div></div>
      <div className="aside-card mcp-card"><div className="mcp-card-icon"><Radio size={16} /></div><div><strong>Connected through MCP</strong><p>The conversation host discovers and calls Market Partner tools over Streamable HTTP.</p></div></div>
    </aside>
  </div>;
}

function ChatResult({ data }: { data: JsonRecord }) {
  const sources = data.source_packet ?? data.snapshot?.positions;
  if (data.source_packet) {
    return <div className="chat-result-card"><div className="result-card-head"><strong>{data.company_name}</strong><DataBadge tone="amber">Synthetic source packet</DataBadge></div><div className="result-two-col"><div><span className="micro-label">Supported case</span><p>{data.supported_case?.[0] ?? "No supported case returned."}</p></div><div><span className="micro-label">Countercase</span><p>{data.countercase?.[0] ?? "No countercase returned."}</p></div></div><div className="citation-pills">{(sources ?? []).slice(0, 4).map((source: JsonRecord) => <span key={source.source_id}><FileText size={12} />{source.title}</span>)}</div></div>;
  }
  if (data.snapshot) return <div className="chat-result-card"><div className="result-card-head"><strong>Sample portfolio snapshot</strong><DataBadge tone="amber">Fixture</DataBadge></div><p>{data.summary}</p><div className="citation-pills"><span><BriefcaseBusiness size={12} />{data.snapshot.positions?.length ?? 0} positions</span><span><Activity size={12} />As of {prettyDate(data.snapshot.as_of)}</span></div></div>;
  if (Array.isArray(data)) return <div className="chat-result-card"><strong>Workflow result</strong><p>{data.length} records returned. Open the relevant workspace panel to review details.</p></div>;
  return <div className="chat-result-card"><div className="result-card-head"><strong>Workflow result</strong><DataBadge tone="gray">Structured data</DataBadge></div><pre>{JSON.stringify(data, null, 2).slice(0, 1100)}</pre></div>;
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
      <div className="content-grid two-thirds">
        <Panel>
          <SectionHeading title="Current positions" detail="Grouped by instrument · amount shown in INR" />
          <div className="table-wrap"><table><thead><tr><th>Security</th><th>Account</th><th>Quantity</th><th>Market value</th><th>As of</th></tr></thead><tbody>
            {overview.snapshot.positions.map((position: JsonRecord) => <tr key={`${position.account_ref}-${position.symbol}`}><td><div className="table-primary">{position.symbol}</div><div className="table-secondary">{position.company_name}</div></td><td>{position.account_alias}</td><td>{position.quantity}</td><td>{money(position.market_value_minor)}</td><td>{position.valuation_as_of ? prettyDate(position.valuation_as_of) : <span className="text-amber">Missing value</span>}</td></tr>)}
          </tbody></table></div>
          <div className="table-footnote"><CircleHelp size={13} /> Missing valuation is unavailable, not zero. This view is not total net worth or buying power.</div>
        </Panel>
        <Panel>
          <SectionHeading title="Exposure by sector" detail="Invested holdings exposure" />
          <div className="exposure-list">{overview.metrics.map((metric: JsonRecord) => <div className="exposure-item" key={metric.label}><div className="exposure-copy"><strong>{metric.label.replace(" invested holdings exposure", "")}</strong><span>{money(metric.amount_minor)}</span></div><div className="exposure-track"><div className="exposure-fill" style={{ width: `${Math.min(metric.percent ?? 0, 100)}%` }} /></div><span className="exposure-percent">{metric.percent == null ? "—" : `${metric.percent}%`}</span></div>)}</div>
          <div className="aside-note"><CircleHelp size={14} /> Percentages are withheld when the denominator is incomplete.</div>
        </Panel>
      </div>
    </>}
    <div className="content-grid two-thirds">
      <Panel><SectionHeading title="Account activity" detail="Synthetic sample records · incomplete fee history" />
        {activities.length ? <div className="activity-list">{activities.map((item) => <div className="activity-item" key={item.activity_id}><div className={`activity-type ${item.activity_type === "BUY" ? "buy" : "sell"}`}><ArrowDownLeft size={15} /></div><div className="activity-copy"><strong>{item.activity_type} {item.instrument_id.split(":")[1]}</strong><span>{prettyDate(item.date)} · {item.account_alias}</span></div><div className="activity-amount">{item.gross_amount_minor ? money(item.gross_amount_minor) : "Amount unavailable"}<span>Fees incomplete</span></div></div>)}</div> : <EmptyState title="No sample activities available" copy="Connect a sample account to see its fixture history." />}
      </Panel>
      <Panel><SectionHeading title="Performance" detail="Only calculated when all required inputs are present" />
        <div className="performance-empty"><div className="empty-icon amber-icon"><Gauge size={18} /></div><strong>Return is unavailable</strong><p>{performance?.missing_inputs?.join(", ") ?? "Required historical data is missing."}</p><DataBadge tone="amber">Insufficient data</DataBadge></div>
      </Panel>
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

  return <div className="page-stack">
    <PageHeading eyebrow="Company research" title="Follow the evidence." copy="One company per run. This local demo has a synthetic source packet for NORTHSTAR; other symbols return an explicit packet-unavailable result." />
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
        <div className="result-actions"><Button variant="secondary" onClick={() => void save()} icon={<Plus size={15} />}>Save dossier</Button>{dossiers.length > 0 && <div className="inline-form"><select aria-label="Choose a dossier for comparison" value={savedDossier} onChange={(event) => setSavedDossier(event.target.value)}><option value="">Compare with saved dossier…</option>{dossiers.map((dossier) => <option key={dossier.dossier_id} value={dossier.dossier_id}>{dossier.title} · v{dossier.version}</option>)}</select><Button variant="secondary" onClick={() => void compare()} disabled={!savedDossier}>Compare</Button></div>}</div>
      </Panel>
      {comparison && <Panel><SectionHeading title="Source changes since dossier" detail={comparison.change_summary} /><div className="compare-grid"><CompareCount label="New sources" count={comparison.new_sources?.length ?? 0} tone="green" /><CompareCount label="Unchanged" count={comparison.unchanged_sources?.length ?? 0} tone="gray" /><CompareCount label="No longer present" count={comparison.removed_sources?.length ?? 0} tone="amber" /></div></Panel>}
      <Panel><SectionHeading title="Evidence packet" detail={`${run.source_packet.length} dated source records · content hashes retained`} />
        <div className="source-list">{run.source_packet.map((source: JsonRecord) => <article className="source-card" key={source.source_id}><div className="source-top"><div className="source-icon"><FileText size={16} /></div><div className="source-title"><strong>{source.title}</strong><span>{source.publisher} · published {prettyDate(source.published_at)} · retrieved {prettyDate(source.retrieved_at)}</span></div><span className="source-type">{source.source_type.replaceAll("_", " ")}</span></div><div className="source-excerpts">{source.excerpts.map((excerpt: JsonRecord) => <p key={excerpt.excerpt_id}><span>{excerpt.excerpt_id}</span>{excerpt.text}</p>)}</div><div className="source-foot"><span>Source ID: {source.source_id}</span><span>Hash: {source.content_hash}</span></div></article>)}</div>
      </Panel>
      <Panel><SectionHeading title="Agent work trace" detail="First drafts of the bull and bear analyses are produced independently." /><div className="agent-grid">{run.analyses.map((analysis: JsonRecord) => <details className="agent-card" key={analysis.role}><summary><span className="agent-symbol">{analysis.role === "bull_case" ? "+" : analysis.role === "bear_case" ? "−" : "•"}</span><span><strong>{analysis.role.replaceAll("_", " ")}</strong><small>{analysis.claim_ids?.length ?? 0} cited excerpts</small></span><ChevronDown size={15} /></summary><p>{analysis.summary}</p>{analysis.counterpoints?.map((item: string) => <span className="agent-line" key={item}>Counterpoint · {item}</span>)}{analysis.open_questions?.map((item: string) => <span className="agent-line" key={item}>Open question · {item}</span>)}</details>)}</div></Panel>
    </div>}
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

function OrdersPage({ notify }: { notify: (message: string) => void }) {
  const [symbol, setSymbol] = useState("NORTHSTAR");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("2");
  const [price, setPrice] = useState("1500.00");
  const [accountAlias, setAccountAlias] = useState("Sample Account A");
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
  const exchange = symbol === "CEDARTECH" ? "BSE" : "NSE";

  const refresh = async () => {
    const [accountRows, orderRows, health] = await Promise.all([api<JsonRecord[]>("/api/accounts"), api<JsonRecord[]>("/api/orders"), api<JsonRecord>("/api/health")]);
    const availableAccounts = accountRows.filter((account) => account.status !== "revoked");
    setAccounts(availableAccounts); setOrders(orderRows);
    setUpstoxReady(Boolean(health.providers?.upstox_sandbox));
    setUpstoxMappingReady(Boolean(health.capabilities?.upstox_instrument_mapping));
    if (!availableAccounts.find((account) => account.alias === accountAlias)) setAccountAlias(availableAccounts[0]?.alias ?? "");
  };
  useEffect(() => { void refresh().catch((error) => notify(error.message)); }, []);

  const makePreview = async () => {
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

  return <div className="page-stack">
    <PageHeading eyebrow="Paper trading" title="Rehearse the terms before confirming." copy="Every preview is immutable and expires after five minutes. Confirmations apply only to the local simulator or explicitly enabled broker sandbox." />
    <div className="notice notice-amber"><ShieldCheck size={17} /><div><strong>{upstoxReady && upstoxMappingReady ? "Local paper and Upstox sandbox modes" : "Local paper mode · no real money"}</strong><span>{upstoxReady && upstoxMappingReady ? "Upstox sandbox is configured for mapped instruments; it cannot reach a live brokerage account." : upstoxReady ? "Sandbox credentials are present, but no demo security has a verified Upstox instrument key. Orders remain local." : "Nothing is sent to Upstox, a brokerage, or an exchange. Sandbox stays disabled until credentials, exact endpoint behavior, and instrument mapping are verified."}</span></div></div>
    <div className="content-grid two-thirds">
      <Panel><SectionHeading title="Create order preview" detail="Enter all terms yourself. Market Partner will not choose a security, side, size, or price." />
        <div className="form-grid order-form"><label className="field"><span>Security</span><select value={symbol} onChange={(event) => setSymbol(event.target.value)}>{demoSymbols.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Exchange</span><input value={exchange} readOnly /></label><label className="field"><span>Side</span><select value={side} onChange={(event) => setSide(event.target.value)}><option value="BUY">Buy</option><option value="SELL">Sell</option></select></label><label className="field"><span>Whole-share quantity</span><input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label className="field"><span>Limit price (₹)</span><input type="number" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} /></label><label className="field"><span>Sample account</span><select value={accountAlias} onChange={(event) => setAccountAlias(event.target.value)}>{accounts.map((account) => <option key={account.account_ref} value={account.alias}>{account.alias} · {account.mode}</option>)}</select></label></div>
        <div className="order-bottom"><span><ShieldCheck size={14} /> User-specified scenario only</span><Button onClick={() => void makePreview()} disabled={busy} icon={<ArrowRight size={15} />}>Preview paper order</Button></div>
      </Panel>
      <Panel><SectionHeading title="Order guardrails" detail="Confirmation must be a separate action." /><div className="guardrail-list"><Guardrail title="Immutable terms" copy="Any change to security, side, quantity, account, or limit price requires a new preview." /><Guardrail title="Five-minute expiry" copy="Expired previews cannot be confirmed. Start again with current terms." /><Guardrail title="No automatic retries" copy="The local simulator records an outcome; a real provider would require reconciliation." /><Guardrail title="No action advice" copy="The exposure scenario is descriptive and does not mean the order is suitable." /></div></Panel>
    </div>
    {preview && <Panel className="order-preview"><div className="preview-header"><div><div className="eyebrow">Review carefully · expires {prettyDate(preview.expires_at)}</div><h2>{preview.side} {preview.quantity} {preview.symbol ?? preview.instrument_id.split(":")[1]}</h2></div><DataBadge tone="amber">{preview.mode === "sandbox" ? "Upstox sandbox" : "Local paper only"}</DataBadge></div><div className="preview-details"><PreviewValue label="Limit price" value={money(Math.round(Number(preview.limit_price) * 100))} /><PreviewValue label="Estimated notional" value={money(preview.estimated_value_minor)} /><PreviewValue label="Account" value={preview.account_alias} /><PreviewValue label="Mode" value={preview.mode === "sandbox" ? "Upstox sandbox" : "Local simulator"} /></div><div className="hypothetical-box"><div><span className="micro-label">Hypothetical invested holdings exposure</span><p>Current {money(preview.current_exposure_minor)} <ArrowRight size={13} /> After scenario {money(preview.hypothetical_exposure_minor)}</p></div><strong>{preview.exposure_percent == null ? "Unavailable" : `${preview.exposure_percent}%`}</strong></div><div className="confirm-row"><label className="checkbox-label"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>I reviewed these exact terms and confirm this {preview.mode === "sandbox" ? "sandbox" : "local paper"} simulation.</span></label><Button onClick={() => void confirmOrder()} disabled={!confirmed || busy} icon={<Check size={15} />}>Confirm paper order</Button></div><div className="preview-warning"><ShieldCheck size={14} />{preview.warning}</div></Panel>}
    {editingOrder && <Panel className="change-preview"><div className="preview-header"><div><div className="eyebrow">Order change draft · no change has been applied</div><h2>Modify {editingOrder.instrument_id.split(":")[1]}</h2></div><DataBadge tone="amber">Local paper only</DataBadge></div><p>Current terms: {editingOrder.quantity} shares at ₹{editingOrder.limit_price}.</p><div className="form-grid order-form"><label className="field"><span>New whole-share quantity</span><input type="number" min="1" step="1" value={changeTerms.quantity} onChange={(event) => setChangeTerms((terms) => ({ ...terms, quantity: event.target.value }))} /></label><label className="field"><span>New limit price (₹)</span><input type="number" min="0.01" step="0.01" value={changeTerms.limit_price} onChange={(event) => setChangeTerms((terms) => ({ ...terms, limit_price: event.target.value }))} /></label></div><div className="order-bottom"><Button variant="secondary" onClick={() => setEditingOrder(null)}>Discard</Button><Button onClick={() => void makeChangePreview(editingOrder, "modify")} disabled={busy}>Review modification</Button></div></Panel>}
    {changePreview && <Panel className="change-preview"><div className="preview-header"><div><div className="eyebrow">Separate confirmation required · expires {prettyDate(changePreview.expires_at)}</div><h2>{changePreview.action === "cancel" ? "Cancel paper order?" : "Modify paper order?"}</h2></div><DataBadge tone="amber">Local paper only</DataBadge></div><p>{changePreview.action === "cancel" ? `Cancel ${changePreview.terms.quantity} shares at ₹${changePreview.terms.limit_price} in the local simulator.` : `Before: ${changePreview.terms.from_quantity} shares at ₹${changePreview.terms.from_limit_price}. After: ${changePreview.terms.quantity} shares at ₹${changePreview.terms.limit_price}.`}</p><div className="confirm-row"><label className="checkbox-label"><input type="checkbox" checked={changeConfirmed} onChange={(event) => setChangeConfirmed(event.target.checked)} /><span>I confirm this exact change to the local paper order.</span></label><Button variant={changePreview.action === "cancel" ? "danger" : "primary"} onClick={() => void confirmChange()} disabled={!changeConfirmed || busy}>Confirm {changePreview.action}</Button></div></Panel>}
    <Panel><SectionHeading title="Paper-order history" detail="Local simulation and verified sandbox status; live brokerage orders are unavailable." action={<Button variant="secondary" onClick={() => void refresh()} icon={<RefreshCw size={14} />}>Refresh status</Button>} />
      {orders.length ? <div className="table-wrap"><table><thead><tr><th>Security</th><th>Side / quantity</th><th>Limit</th><th>Status</th><th>Last checked</th><th>Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={order.order_id}><td><div className="table-primary">{order.instrument_id.split(":")[1]}</div><div className="table-secondary">{order.mode === "sandbox" ? `Upstox sandbox · ${order.provider_order_id ?? "reconciliation pending"}` : "Local simulation · no exchange order"}</div></td><td>{order.side} {order.quantity}</td><td>{money(Math.round(Number(order.limit_price) * 100))}</td><td><DataBadge tone={order.status.includes("CANCELLED") ? "gray" : order.status.includes("UNKNOWN") ? "amber" : "green"}>{order.status.replaceAll("_", " ")}</DataBadge></td><td>{prettyDate(order.status_as_of)}</td><td><div className="table-action-group"><button className="text-action" onClick={async () => { try { const status = await api<JsonRecord>(`/api/orders/${order.order_id}/status?refresh=true`); notify(`Status: ${status.status} · ${status.mode}`); await refresh(); } catch (error) { notify(error instanceof Error ? error.message : "Status unavailable."); } }}>Status</button>{["ACCEPTED_SIMULATED", "OPEN_SIMULATED"].includes(order.status) && <><button className="text-action" onClick={() => startOrderEdit(order)}>Modify</button><button className="text-action subtle-action" onClick={() => void makeChangePreview(order, "cancel")}>Cancel</button></>}</div></td></tr>)}</tbody></table></div> : <EmptyState title="No paper orders yet" copy="Create and review a preview. It will only enter this local simulator after your separate confirmation." />}
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
      <Panel><SectionHeading title="Provider readiness" detail="A credential alone does not activate an integration; its capability gate must also be verified." /><div className="provider-readiness"><ProviderStatus name="Amazon Bedrock" detail="Agent and conversation model calls" ready={Boolean(providerState.bedrock)} /><ProviderStatus name="Upstox sandbox" detail="Order submission and status only" ready={Boolean(providerState.upstox_sandbox)} /><ProviderStatus name="SnapTrade" detail="Authorized read-only account data" ready={Boolean(providerState.snaptrade)} /><ProviderStatus name="Email / push" detail="Opt-in alert delivery" ready={false} /></div></Panel>
  </div>;
}

function ProviderStatus({ name, detail, ready }: { name: string; detail: string; ready: boolean }) {
  return <div className="provider-status"><div><strong>{name}</strong><span>{detail}</span></div><DataBadge tone={ready ? "green" : "gray"}>{ready ? "Connected" : "Not configured"}</DataBadge></div>;
}

export default App;
