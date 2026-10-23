/**
 * Market Partner — Browser Speech Synthesis & Audio Management
 *
 * Provides natural speech preprocessing for financial data,
 * asynchronous voice discovery (preferring English India / en-IN),
 * local preference persistence, and robust utterance lifecycle control.
 */

export interface VoiceSettings {
  voiceURI: string;
  rate: number;
  pitch: number;
  conciseSpeech: boolean;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  voiceURI: "",
  rate: 1.0,
  pitch: 1.0,
  conciseSpeech: true,
};

const STORAGE_KEY = "market_partner_voice_settings";

/**
 * Load voice settings from localStorage with safe fallback defaults.
 */
export function loadVoiceSettings(): VoiceSettings {
  if (typeof window === "undefined") return DEFAULT_VOICE_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : "",
      rate: typeof parsed.rate === "number" && parsed.rate >= 0.7 && parsed.rate <= 1.4 ? parsed.rate : 1.0,
      pitch: typeof parsed.pitch === "number" && parsed.pitch >= 0.8 && parsed.pitch <= 1.2 ? parsed.pitch : 1.0,
      conciseSpeech: typeof parsed.conciseSpeech === "boolean" ? parsed.conciseSpeech : true,
    };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

/**
 * Save voice settings to localStorage.
 */
export function saveVoiceSettings(settings: VoiceSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore localStorage write failures in private/sandboxed mode
  }
}

/**
 * Preprocesses markdown and financial formatting into smooth, conversational spoken text.
 * Strips code blocks, tables, and syntax markers while carefully enunciating Indian
 * currency, percentages, ratios, acronyms, and sentence pauses.
 */
export function formatTextForSpeech(text: string, concise: boolean = false): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove code blocks and JSON dumps
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");

  // 2. Remove table rows and pipe dividers
  cleaned = cleaned.replace(/\|[^\n]+\|/g, " ");

  // 3. Remove markdown headers, list bullets, blockquotes
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/^[\s*+-]+\s+/gm, "");
  cleaned = cleaned.replace(/^>\s+/gm, "");

  // 4. Remove bold/italics markers
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");

  // 5. Remove HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, " ");

  // 6. Naturalize Indian currency figures
  // ₹1,53,500 or ₹ 37,500.00 -> 1,53,500 rupees
  cleaned = cleaned.replace(/₹\s*([0-9,]+(?:\.[0-9]{1,2})?)/g, (_match, amt) => {
    return `${amt} rupees`;
  });
  cleaned = cleaned.replace(/\bINR\s*([0-9,]+(?:\.[0-9]{1,2})?)/gi, (_match, amt) => {
    return `${amt} rupees`;
  });
  cleaned = cleaned.replace(/₹/g, " rupees ");

  // 7. Naturalize percentage changes and ratios
  cleaned = cleaned.replace(/\+([0-9]+(?:\.[0-9]+)?)\s*%/g, "plus $1 percent");
  cleaned = cleaned.replace(/-([0-9]+(?:\.[0-9]+)?)\s*%/g, "minus $1 percent");
  cleaned = cleaned.replace(/([0-9]+(?:\.[0-9]+)?)\s*%/g, "$1 percent");

  // 8. Naturalize financial abbreviations and market terminology
  cleaned = cleaned.replace(/\bNSE\b/g, "N S E");
  cleaned = cleaned.replace(/\bBSE\b/g, "B S E");
  cleaned = cleaned.replace(/\bP\/E\b/gi, "P to E ratio");
  cleaned = cleaned.replace(/\bD\/E\b/gi, "Debt to Equity ratio");
  cleaned = cleaned.replace(/\bFY\s*20?([0-9]{2})\b/gi, "Financial Year 20$1");
  cleaned = cleaned.replace(/\bQ([1-4])\b/g, "Quarter $1");
  cleaned = cleaned.replace(/\bvs\.?\b/gi, "versus");
  cleaned = cleaned.replace(/\be\.?g\.?,?\b/gi, "for example");
  cleaned = cleaned.replace(/\bi\.?e\.?,?\b/gi, "that is");

  // 9. Naturalize URL links
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // 10. Clean up sentence boundaries and multiple whitespace
  cleaned = cleaned.replace(/[\r\n]+/g, ". ");
  cleaned = cleaned.replace(/\s{2,}/g, " ");
  cleaned = cleaned.replace(/\.{2,}/g, ".");
  cleaned = cleaned.replace(/\s+\./g, ".");
  cleaned = cleaned.trim();

  // 11. If concise mode is enabled, extract the core answer without verbose trailing citations
  if (concise && cleaned.length > 320) {
    const sentences = cleaned.match(/[^.!?]+[.!?]+/g) || [cleaned];
    if (sentences.length > 2) {
      let summary = "";
      for (const sentence of sentences) {
        if ((summary + sentence).length > 300) break;
        summary += sentence + " ";
      }
      if (summary.trim()) {
        cleaned = summary.trim();
      }
    }
  }

  return cleaned;
}

/**
 * Returns available browser speech synthesis voices, sorted to prioritize
 * Indian English (en-IN), natural/neural voices, and English dialects.
 */
export function getPrioritizedVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }

  const allVoices = window.speechSynthesis.getVoices();
  if (!allVoices || allVoices.length === 0) return [];

  const englishVoices = allVoices.filter((v) => {
    const lang = v.lang.toLowerCase().replace("_", "-");
    return lang.startsWith("en") || lang.includes("en-");
  });

  const voicePool = englishVoices.length > 0 ? englishVoices : allVoices;

  const scoreVoice = (voice: SpeechSynthesisVoice): number => {
    let score = 0;
    const lang = voice.lang.toLowerCase().replace("_", "-");
    const name = voice.name.toLowerCase();

    // Priority 1: Indian English
    if (lang === "en-in") score += 100;
    else if (lang.startsWith("en-")) score += 40;

    // Quality hints
    if (name.includes("natural")) score += 30;
    if (name.includes("online")) score += 20;
    if (name.includes("neural")) score += 25;
    if (name.includes("google")) score += 15;
    if (name.includes("siri") || name.includes("apple")) score += 15;
    if (name.includes("enhanced") || name.includes("premium")) score += 20;
    if (voice.default) score += 5;

    // Discourage robotic legacy voices
    if (name.includes("whisper") || name.includes("zarvox") || name.includes("trinoids")) score -= 50;

    return score;
  };

  return [...voicePool].sort((a, b) => scoreVoice(b) - scoreVoice(a));
}

/**
 * Resolves the active voice to use based on user settings and system availability.
 */
export function resolveVoice(
  voices: SpeechSynthesisVoice[],
  preferredURI?: string
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  if (preferredURI) {
    const matched = voices.find((v) => v.voiceURI === preferredURI);
    if (matched) return matched;
  }

  return voices[0] || null;
}
