import type { AiCategory } from "@/lib/account/profile";
import { retrieveContext, type CategoryReader, type ContextPack } from "./context";
import type { CanProcessAi } from "./gate";
import { classify, INTENT_LABEL, type Classification } from "./intent";
import { buildIR, compile, compileHandoff, qualityGate, type ChatMessage, type Compiled, type PromptIR, type QualityReport } from "./prompt";
import { AI_ERROR_TEXT, mapError, type AiErrorCode, type Credential, type ProviderAdapter, type Usage } from "./providers";
import { OUTPUT_CHAR_LIMIT, validateOutput, WARNING_TEXT, type FinishReason, type Validation } from "./validate";

// One Tanya Ata request, end to end (blueprint 02 §1): classify → gate + retrieve → compile → quality gate →
// execute through the user's provider → validate → result with provenance.

export type Prepared = {
  classification: Classification;
  context: ContextPack;
  ir: PromptIR;
  compiled: Compiled;
  quality: QualityReport;
};

export async function prepare(input: {
  question: string;
  history: ChatMessage[];
  userId: string | null;
  gate: CanProcessAi;
  read: CategoryReader;
}): Promise<Prepared> {
  const classification = classify(input.question);
  const context = await retrieveContext({ userId: input.userId, wanted: classification.categories, gate: input.gate, read: input.read });
  const ir = buildIR(input.question, input.history, classification, context);
  const compiled = compile(ir);
  return { classification, context, ir, compiled, quality: qualityGate(ir, compiled) };
}

/** What a result is traceable to. Safe to show the user: it is their own data and nothing about the key. */
export function provenance(prepared: Prepared) {
  const { classification, context, quality } = prepared;
  return {
    intent: classification.intent,
    intent_label: INTENT_LABEL[classification.intent],
    task: classification.task,
    confidence: classification.confidence,
    requested: classification.categories,
    sources: context.sources.map((s) => ({ id: s.id, category: s.category, label: s.label, text: s.text })),
    blocked: context.blocked,
    empty: context.empty,
    trimmed: context.trimmed,
    context_tokens: context.tokens,
    quality: { average: quality.average, pass: quality.pass },
  };
}
export type Provenance = ReturnType<typeof provenance>;

/** The same facts without any stored text, for the run record. */
export function provenanceRecord(prepared: Prepared) {
  return {
    intent: prepared.classification.intent,
    categories: [...new Set(prepared.context.sources.map((s) => s.category))] as AiCategory[],
    sources: prepared.context.sources.map((s) => ({ id: s.id, category: s.category })),
    blocked: prepared.context.blocked,
  };
}

export const handoffPrompt = (prepared: Prepared) => compileHandoff(prepared.ir);

export type TanyaEvent =
  | { type: "delta"; text: string }
  | { type: "done"; validation: Validation; warnings: string[]; usage: Usage; finish: FinishReason }
  | { type: "error"; code: AiErrorCode | "empty_output"; message: string; action: string; retry_after_s?: number; partial: boolean };

/** Streams the provider's answer, then validates it. Every failure ends in one honest error event; nothing is made up. */
export async function* execute(prepared: Prepared, adapter: ProviderAdapter, credential: Credential, signal?: AbortSignal): AsyncGenerator<TanyaEvent> {
  let text = "";
  let finish: FinishReason = "other";
  let usage: Usage = {};
  try {
    const request = { system: prepared.compiled.system, messages: prepared.compiled.messages, maxOutputTokens: prepared.compiled.maxOutputTokens, signal };
    for await (const event of adapter.stream(request, credential)) {
      if (event.type === "finish") {
        ({ reason: finish, usage } = event);
        continue;
      }
      const room = OUTPUT_CHAR_LIMIT - text.length;
      if (room <= 0) {
        finish = "length";
        break;
      }
      const piece = event.text.slice(0, room);
      text += piece;
      yield { type: "delta", text: piece };
    }
  } catch (error) {
    const mapped = adapter.mapError(error) ?? mapError(error);
    const shown = AI_ERROR_TEXT[mapped.code];
    yield { type: "error", code: mapped.code, message: shown.message, action: shown.action, retry_after_s: mapped.retryAfterS, partial: text.length > 0 };
    return;
  }
  const validation = validateOutput(text, { sources: prepared.context.sources, classification: prepared.classification, finish });
  if (!validation.ok) {
    yield {
      type: "error", code: "empty_output", partial: false, action: "retry",
      message: finish === "filter" ? "Provider menolak menjawab karena filter kontennya." : "Provider tidak mengirim jawaban. Coba lagi atau ganti model.",
    };
    return;
  }
  yield { type: "done", validation, warnings: validation.warnings.map((w) => WARNING_TEXT[w]), usage, finish };
}
