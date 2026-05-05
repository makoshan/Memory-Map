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
