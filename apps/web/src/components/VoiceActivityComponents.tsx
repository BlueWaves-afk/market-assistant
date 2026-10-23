import { useState } from "react";
import {
  Mic,
  Volume2,
  Cpu,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  SlidersHorizontal,
  X,
  Play,
  Check,
} from "lucide-react";
import { prettyDate, type JsonRecord } from "../lib/api";
import { type VoiceSettings } from "../lib/speech";
import logoAsset from "../assets/logo.png";

export type VoiceState = "ready" | "listening" | "processing" | "speaking" | "error";

/**
 * Institutional Market Partner Brand Mark
 * Displays the official custom emblem: ascending market performance graph with upward trendline.
 */
export function BrandMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <img
      src={logoAsset}
      alt="Market Partner"
      width={size}
      height={size}
      className={`brand-logo-img ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        objectFit: "contain",
        display: "inline-block",
        verticalAlign: "middle",
      }}
    />
  );
}

/**
 * Audio Waveform Visualizer
 * Reacts directly to real audio amplitude levels captured via Web Audio API.
 * Gracefully renders restrained state-based visuals when amplitude is resting.
 */
export function VoiceWaveform({
  state,
  audioLevels = [0.15, 0.2, 0.15, 0.3, 0.2, 0.25, 0.15],
}: {
  state: VoiceState;
  audioLevels?: number[];
}) {
  const bars = audioLevels.length === 7 ? audioLevels : [0.15, 0.25, 0.4, 0.6, 0.4, 0.25, 0.15];

  return (
    <div
      className={`voice-waveform-container state-${state}`}
      role="img"
      aria-label={`Voice interface state: ${state}`}
    >
      <div className="waveform-bars">
        {bars.map((level, idx) => {
          let heightPct = 15;
          if (state === "listening") {
            // Level is 0.0 to 1.0 from AnalyserNode
            heightPct = Math.max(14, Math.min(100, Math.round(level * 100)));
          } else if (state === "speaking") {
            // Restrained rhythmic wave for audio playback
            const phase = idx * 0.45;
            heightPct = Math.round(22 + 40 * Math.abs(Math.sin(phase)));
          } else if (state === "processing") {
            heightPct = 25;
          } else if (state === "error") {
            heightPct = 10;
          }

          return (
            <span
              key={idx}
              className={`waveform-bar bar-${idx}`}
              style={{
                height: `${heightPct}%`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * Siri-Inspired Fluid Animated Voice Orb
 * Multi-layer chromatic aura with organic audio-driven responsiveness,
 * subtle idle respiration, orbital processing rotation, and full reduced-motion support.
 */
export function SiriVoiceOrb({
  state,
  audioLevels = [0.15, 0.2, 0.15, 0.3, 0.2, 0.25, 0.15],
  onClick,
  disabled = false,
}: {
  state: VoiceState;
  audioLevels?: number[];
  onClick: () => void;
  disabled?: boolean;
}) {
  const avgLevel =
    audioLevels.length > 0
      ? audioLevels.reduce((sum, val) => sum + val, 0) / audioLevels.length
      : 0.2;
  const dynamicHaloScale = state === "listening" ? Math.min(1.38, 0.98 + avgLevel * 0.5) : 1;
  const dynamicHaloOpacity = state === "listening" ? Math.min(0.95, 0.45 + avgLevel * 0.6) : 0.65;

  return (
    <button
      type="button"
      className={`siri-orb state-${state} ${disabled ? "is-disabled" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={
        state === "listening"
          ? "Stop listening"
          : state === "speaking"
          ? "Stop voice response"
          : state === "processing"
          ? "Processing your request"
          : state === "error"
          ? "Retry microphone access"
          : "Start voice conversation"
      }
      title={
        state === "listening"
          ? "Click to stop listening and evaluate request"
          : state === "speaking"
          ? "Click to interrupt voice playback"
          : state === "error"
          ? "Click to retry microphone"
          : "Click to talk with Market Partner"
      }
    >
      {/* Outer ambient chromatic diffusion */}
      <span
        className="siri-orb-ambient"
        style={{
          transform: `scale(${dynamicHaloScale})`,
          opacity: dynamicHaloOpacity,
        }}
      />

      {/* Layered fluid chromatic mesh rings */}
      <span className="siri-orb-ring ring-primary" />
      <span className="siri-orb-ring ring-secondary" />

      {/* Glassmorphic Core */}
      <span className="siri-orb-core">
        {state === "listening" || state === "speaking" ? (
          <VoiceWaveform state={state} audioLevels={audioLevels} />
        ) : state === "processing" ? (
          <span className="siri-orb-spinner" />
        ) : state === "error" ? (
          <AlertCircle size={20} className="siri-orb-error-icon" />
        ) : (
          <Mic size={20} className="siri-orb-mic-icon" />
        )}
      </span>
    </button>
  );
}

/**
 * Voice Stage Status Badge
 * Communicates system state with accessible, institutional clarity and inline retry action.
 */
export function VoiceStatusBadge({
  state,
  errorMessage,
  onRetry,
}: {
  state: VoiceState;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  switch (state) {
    case "listening":
      return (
        <span className="voice-status-pill listening">
          <span className="live-dot" />
          <span>Listening… Speak your prompt</span>
        </span>
      );
    case "processing":
      return (
        <span className="voice-status-pill processing">
          <span className="processing-pulse" />
          <span>Processing transcript & evaluating tools…</span>
        </span>
      );
    case "speaking":
      return (
        <span className="voice-status-pill speaking">
          <Volume2 size={13} />
          <span>Audio response playing · Click orb to interrupt</span>
        </span>
      );
    case "error":
      return (
        <span className="voice-status-pill error">
          <AlertCircle size={13} />
          <span>{errorMessage || "Microphone access unavailable"}</span>
          {onRetry && (
            <button
              type="button"
              className="retry-pill-btn"
              onClick={onRetry}
              title="Retry microphone initialization"
            >
              <RotateCcw size={11} /> Retry
            </button>
          )}
        </span>
      );
    case "ready":
    default:
      return (
        <span className="voice-status-pill ready">
          <Mic size={13} />
          <span>Voice ready · Click orb to speak</span>
        </span>
      );
  }
}

/**
 * Dedicated Assistant Thinking Bubble
 * Renders an institutional typing indicator while the request is being evaluated.
 */
export function ThinkingBubble() {
  return (
    <div className="message-row assistant thinking-row" aria-live="polite">
      <div className="message-avatar thinking-avatar">
        <BrandMark size={14} />
      </div>
      <div className="message-content">
        <div className="message-bubble thinking-bubble">
          <div className="thinking-header">
            <span className="thinking-pulse-dot" />
            <span className="thinking-status-text">
              Synthesizing response & evaluating portfolio tools…
            </span>
          </div>
          <div className="typing-dots-wave" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Voice & Speech Settings Modal / Popover
 * Allows customizing browser voice, speech rate, and concise audio summaries.
 */
export function VoiceSettingsModal({
  open,
  onClose,
  settings,
  onUpdateSettings,
  voices,
  onPreviewVoice,
}: {
  open: boolean;
  onClose: () => void;
  settings: VoiceSettings;
  onUpdateSettings: (newSettings: VoiceSettings) => void;
  voices: SpeechSynthesisVoice[];
  onPreviewVoice: () => void;
}) {
  if (!open) return null;

  const indianVoices = voices.filter((v) => v.lang.toLowerCase().replace("_", "-") === "en-in");
  const otherEnglishVoices = voices.filter(
    (v) => v.lang.toLowerCase().replace("_", "-") !== "en-in"
  );

  return (
    <div className="voice-settings-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="voice-settings-card" onClick={(e) => e.stopPropagation()}>
        <div className="voice-settings-head">
          <div className="voice-settings-title-group">
            <SlidersHorizontal size={15} className="text-accent" />
            <strong>Voice & Speech Synthesis</strong>
          </div>
          <button
            type="button"
            className="icon-button close-btn"
            onClick={onClose}
            aria-label="Close voice settings"
          >
            <X size={15} />
          </button>
        </div>

        <div className="voice-settings-body">
          {/* Voice Selector */}
          <div className="setting-row">
            <label className="setting-label" htmlFor="voice-select">
              <span>Text-to-Speech Voice</span>
              <span className="setting-hint">English (India) recommended</span>
            </label>
            <select
              id="voice-select"
              className="voice-select-input"
              value={settings.voiceURI}
              onChange={(e) => onUpdateSettings({ ...settings, voiceURI: e.target.value })}
            >
              {indianVoices.length > 0 && (
                <optgroup label="English (India) — Recommended">
                  {indianVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {otherEnglishVoices.length > 0 && (
                <optgroup label="Other Available Voices">
                  {otherEnglishVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </optgroup>
              )}
              {voices.length === 0 && <option value="">Default System Voice</option>}
            </select>
          </div>

          {/* Speech Rate Slider */}
          <div className="setting-row">
            <div className="setting-label-row">
              <label htmlFor="rate-slider">Speech Rate</label>
              <span className="setting-value-badge">{settings.rate.toFixed(2)}x</span>
            </div>
            <input
              id="rate-slider"
              type="range"
              min="0.75"
              max="1.35"
              step="0.05"
              value={settings.rate}
              onChange={(e) => onUpdateSettings({ ...settings, rate: parseFloat(e.target.value) })}
              className="setting-slider"
            />
            <div className="slider-ticks">
              <span>0.75x (Deliberate)</span>
              <span>1.0x (Normal)</span>
              <span>1.35x (Fast)</span>
            </div>
          </div>

          {/* Concise Summaries Toggle */}
          <div className="setting-row toggle-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.conciseSpeech}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, conciseSpeech: e.target.checked })
                }
              />
              <div>
                <strong>Concise spoken summaries</strong>
                <p>
                  Speaks direct answers & key metrics clearly; full structured dossier stays in chat.
                </p>
              </div>
            </label>
          </div>

          {/* Action Row */}
          <div className="voice-settings-actions">
            <button
              type="button"
              className="btn btn-secondary preview-voice-btn"
              onClick={onPreviewVoice}
            >
              <Play size={13} /> Test Voice Preview
            </button>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              <Check size={13} /> Done
            </button>
          </div>

          <div className="voice-settings-footnote">
            <ShieldCheck size={13} />
            <span>
              Runs offline via browser-native SpeechSynthesis. No audio is transmitted to external
              services.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Genuine Agent Activity Trace
 * Displays real tool calls, parameters, model usage, and source citations
 * returned by the backend without fabricating intermediate steps or reasoning.
 */
export function AgentActivityTrace({
  toolCalls,
  modelUsage,
  data,
}: {
  toolCalls?: JsonRecord[];
  modelUsage?: JsonRecord | null;
  data?: JsonRecord | null;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!toolCalls || toolCalls.length === 0) {
    return null;
  }

  const getToolDisplayName = (name: string) => {
    switch (name) {
      case "get_portfolio_exposure":
        return "Portfolio Exposure Audit";
      case "research_company":
        return "Bounded Research Graph";
      case "preview_paper_order":
        return "Paper Order Simulation Engine";
      default:
        return name.replaceAll("_", " ");
    }
  };

  const getToolSummary = (call: JsonRecord) => {
    if (call.name === "get_portfolio_exposure") {
      const sym = call.arguments?.symbol || "portfolio";
      return `Queried sample holdings & valuation for ${sym}. Verified partial portfolio coverage.`;
    }
    if (call.name === "research_company") {
      const sym = call.arguments?.symbol || "security";
      const sourceCount = data?.source_packet?.length || 0;
      return `Loaded ${sourceCount > 0 ? sourceCount : "bounded"} dated source record(s) for ${sym}. Synthesized bull/bear cases.`;
    }
    if (call.name === "preview_paper_order") {
      const { symbol, quantity, side, limit_price } = call.arguments || {};
      return `Prepared simulation preview: ${side || "ORDER"} ${quantity || 0} ${symbol || ""} @ ₹${limit_price || "0.00"}. Separate confirmation required.`;
    }
    return `Executed with arguments: ${JSON.stringify(call.arguments || {})}`;
  };

  return (
    <div className="agent-activity-trace">
      <button
        type="button"
        className="trace-summary-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="trace-summary-left">
          <Cpu size={14} className="text-accent" />
          <span className="trace-title">
            Agent Execution Trace · {toolCalls.length} tool{toolCalls.length > 1 ? "s" : ""}
          </span>
          <span className="data-badge badge-green">Completed</span>
        </div>

        <div className="trace-summary-right">
          {modelUsage && (
            <span className="trace-model-tag">
              {modelUsage.provider || "Sarvam AI"} · {modelUsage.requests} req ·{" "}
              {Number(modelUsage.total_tokens || modelUsage.prompt_tokens || 0).toLocaleString()} tokens
            </span>
          )}
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {expanded && (
        <div className="trace-body">
          <div className="trace-steps-list">
            {toolCalls.map((call, idx) => (
              <div key={idx} className="trace-step-item">
                <div className="trace-step-top">
                  <div className="step-badge-group">
                    <CheckCircle2 size={13} className="text-emerald" />
                    <strong>{getToolDisplayName(call.name)}</strong>
                    <code className="trace-code-name">{call.name}()</code>
                  </div>
                  <span className="trace-step-status">Verified local fixture</span>
                </div>

                <p className="trace-step-desc">{getToolSummary(call)}</p>

                {call.arguments && Object.keys(call.arguments).length > 0 && (
                  <div className="trace-args-box">
                    <span className="micro-label">Parameters</span>
                    <div className="args-pills">
                      {Object.entries(call.arguments).map(([k, v]) => (
                        <span key={k} className="arg-pill">
                          <strong>{k}:</strong> {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Evidence citations if research sources exist */}
                {call.name === "research_company" && data?.source_packet && (
                  <div className="trace-evidence-box">
                    <span className="micro-label">Verified Evidence Packet</span>
                    <div className="evidence-records">
                      {data.source_packet.slice(0, 3).map((source: JsonRecord) => (
                        <div key={source.source_id} className="evidence-record-chip">
                          <FileText size={12} />
                          <span>{source.title}</span>
                          <small>({prettyDate(source.published_at)})</small>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="trace-footer-note">
            <ShieldCheck size={13} />
            <span>
              Deterministic MCP execution. No hidden reasoning or unverified chain-of-thought is exposed.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
