import type { AgentContextSnapshot, HermesAnalysisJob, MediaAsset } from "../domain/types";

export type HermesPayload = {
  sessionId: string;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  metadata: {
    source: "memory-map";
    privacy: "semantic-summary-only";
    analysisType?: "ai-three-lines" | "media-analysis";
    mediaAssetType?: MediaAsset["type"];
  };
};

export type HermesImageMeaning = {
  sceneSummary: string;
  memoryMeaning: string;
  topics: string[];
  placeRoleHint: string;
  confidence: number;
};

export type HermesImageMeaningInput = {
  fileName: string;
  imageDataUrl: string;
  capturedAt?: string;
  gps?: {
    longitude: number;
    latitude: number;
    altitude?: number;
    horizontalError?: number;
  };
  address?: {
    formattedAddress?: string;
    roads?: string[];
    pois?: string[];
  };
};

export type HermesImageMeaningRequest = {
  model: "hermes-agent";
  stream: false;
  messages: Array<
    | {
        role: "system";
        content: string;
      }
    | {
        role: "user";
        content: Array<
          | { type: "text"; text: string }
          | { type: "image_url"; image_url: { url: string; detail: "high" } }
        >;
      }
  >;
};

export function createHermesPayload(context: AgentContextSnapshot): HermesPayload {
  return {
    sessionId: `memory-map-${context.userId}`,
    messages: [
      {
        role: "user",
        content: [
          `Event summary: ${context.eventSummary}`,
          `Media asset summary: ${context.mediaAssetSummary}`,
          `Place profile diff: ${context.placeProfileDiff}`,
          `Active risks: ${context.activeRisks.join("; ") || "none"}`,
          `Active opportunities: ${context.activeOpportunities.join("; ") || "none"}`,
          `Today tasks: ${context.todayTasks.join("; ")}`,
          `Layer 3 changes: ${context.layer3Changes}`,
          "Return exactly three short lines: conclusion, suggestion, risk."
        ].join("\n")
      }
    ],
    metadata: {
      source: "memory-map",
      privacy: "semantic-summary-only",
      analysisType: "ai-three-lines"
    }
  };
}

const semanticMediaContent = (asset: MediaAsset) => {
  if (asset.type === "audio") {
    return asset.transcript || asset.text || "No transcript yet.";
  }

  if (asset.type === "note") {
    return asset.text || "Empty note.";
  }

  return asset.text || `Imported image${asset.fileName ? ` named ${asset.fileName}` : ""}.`;
};

export function createHermesMediaAnalysisPayload(asset: MediaAsset, context: AgentContextSnapshot): HermesPayload {
  return {
    sessionId: `memory-map-${context.userId}`,
    messages: [
      {
        role: "system",
        content: [
          "You are Hermes Agent analyzing Memory Map semantic inputs.",
          "Use imported media summaries, notes, and transcripts to create structured Event and Opportunity drafts.",
          "Do not request or infer raw file paths."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          `Media asset id: ${asset.id}`,
          `Media type: ${asset.type}`,
          `Imported at: ${asset.importedAt}`,
          `Captured at: ${asset.capturedAt ?? "unknown"}`,
          `Place hint: ${asset.placeHint?.placeId ?? "unbound"}`,
          `Content: ${semanticMediaContent(asset)}`,
          `Event summary: ${context.eventSummary}`,
          `Media summary: ${context.mediaAssetSummary}`,
          `Place profile diff: ${context.placeProfileDiff}`,
          `Active risks: ${context.activeRisks.join("; ") || "none"}`,
          `Active opportunities: ${context.activeOpportunities.join("; ") || "none"}`,
          `Layer 3 changes: ${context.layer3Changes}`,
          "Return JSON with eventDraft, opportunityDraft, and worldExplanation."
        ].join("\n")
      }
    ],
    metadata: {
      source: "memory-map",
      privacy: "semantic-summary-only",
      analysisType: "media-analysis",
      mediaAssetType: asset.type
    }
  };
}

export function createHermesImageMeaningRequest(input: HermesImageMeaningInput): HermesImageMeaningRequest {
  const gpsLine = input.gps
    ? [
        `WGS84: ${input.gps.longitude}, ${input.gps.latitude}`,
        input.gps.altitude === undefined ? undefined : `Altitude: ${input.gps.altitude} m`,
        input.gps.horizontalError === undefined ? undefined : `Horizontal error: ${input.gps.horizontalError} m`
      ].filter(Boolean).join("\n")
    : "WGS84: unavailable";
  const addressLine = input.address?.formattedAddress
    ? [
        `Amap address: ${input.address.formattedAddress}`,
        `Roads: ${input.address.roads?.join(" / ") || "unknown"}`,
        `POIs: ${input.address.pois?.join(" / ") || "unknown"}`
      ].join("\n")
    : "Amap address: unavailable";

  return {
    model: "hermes-agent",
    stream: false,
    messages: [
      {
        role: "system",
        content: [
          "You summarize image meaning for Memory Map.",
          "Use the visual content as primary evidence and GPS/address as supporting evidence.",
          "Do not invent private facts, identity, intent, or events that are not visible.",
          "Return strict JSON only."
        ].join("\n")
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              `File name: ${input.fileName}`,
              `Captured at: ${input.capturedAt ?? "unknown"}`,
              gpsLine,
              addressLine,
              "Return strict JSON with keys: sceneSummary, memoryMeaning, topics, placeRoleHint, confidence.",
              "sceneSummary: one short Chinese sentence about what is visible.",
              "memoryMeaning: one short Chinese sentence about why this belongs in a personal memory map.",
              "topics: 2-5 short English tags.",
              "placeRoleHint: one of memory, work, life, travel, finance, recovery, unknown.",
              "confidence: number from 0 to 1."
            ].join("\n")
          },
          {
            type: "image_url",
            image_url: {
              url: input.imageDataUrl,
              detail: "high"
            }
          }
        ]
      }
    ]
  };
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  if (fenced?.startsWith("{") && fenced.endsWith("}")) return fenced;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function clampConfidence(value: unknown) {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(1, numeric));
}

export function parseHermesImageMeaningResponse(response: unknown): HermesImageMeaning {
  const content = (response as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content;
  if (typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Hermes image meaning response did not include assistant content");
  }
  const parsed = JSON.parse(extractJsonObject(content)) as Partial<HermesImageMeaning>;

  return {
    sceneSummary: String(parsed.sceneSummary || "图片画面已由 Hermes 处理，但未返回可用场景摘要。"),
    memoryMeaning: String(parsed.memoryMeaning || "这张图片可作为一次地点记忆的视觉证据。"),
    topics: Array.isArray(parsed.topics) ? parsed.topics.map(String).filter(Boolean).slice(0, 5) : ["memory", "photo"],
    placeRoleHint: String(parsed.placeRoleHint || "unknown"),
    confidence: clampConfidence(parsed.confidence)
  };
}

export async function requestHermesImageMeaning(input: HermesImageMeaningInput) {
  const baseUrl = (import.meta.env.VITE_HERMES_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
  const apiKey = import.meta.env.VITE_HERMES_API_KEY as string | undefined;
  const payload = createHermesImageMeaningRequest(input);

  if (!baseUrl || !apiKey) {
    return {
      status: "offline" as const,
      payload
    };
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Hermes image meaning failed with ${response.status}`);
  }

  const data = await response.json();
  return {
    status: "sent" as const,
    payload,
    meaning: parseHermesImageMeaningResponse(data)
  };
}

export function createHermesAnalysisJob(
  asset: MediaAsset,
  payload: HermesPayload,
  createdAt = new Date().toISOString()
): HermesAnalysisJob {
  return {
    id: `hermes-job-${asset.id}`,
    mediaAssetId: asset.id,
    jobType: "media-analysis",
    inputSummary: JSON.stringify({
      assetId: asset.id,
      type: asset.type,
      source: asset.source,
      contentPreview: semanticMediaContent(asset).slice(0, 160),
      messageCount: payload.messages.length,
      privacy: payload.metadata.privacy
    }),
    status: "pending",
    createdAt
  };
}

export async function sendToHermes(context: AgentContextSnapshot) {
  const payload = createHermesPayload(context);

  if (!import.meta.env.VITE_HERMES_GATEWAY_URL) {
    return {
      status: "offline" as const,
      payload
    };
  }

  const response = await fetch(import.meta.env.VITE_HERMES_GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Hermes gateway failed with ${response.status}`);
  }

  return {
    status: "sent" as const,
    payload,
    data: await response.json()
  };
}

export async function sendMediaAssetToHermes(asset: MediaAsset, context: AgentContextSnapshot) {
  const payload = createHermesMediaAnalysisPayload(asset, context);
  const job = createHermesAnalysisJob(asset, payload);

  if (!import.meta.env.VITE_HERMES_GATEWAY_URL) {
    return {
      status: "offline" as const,
      payload,
      job
    };
  }

  const response = await fetch(import.meta.env.VITE_HERMES_GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Hermes gateway failed with ${response.status}`);
  }

  return {
    status: "sent" as const,
    payload,
    job: {
      ...job,
      status: "completed" as const,
      completedAt: new Date().toISOString(),
      outputJson: JSON.stringify(await response.json())
    }
  };
}
