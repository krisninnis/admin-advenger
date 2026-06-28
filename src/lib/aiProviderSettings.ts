export type AiMode = "local_rules" | "local_ollama";

export type AiProviderSettings = {
  mode: AiMode;
  ollamaUrl: string;
  ollamaModel: string;
};

const aiProviderSettingsKey = "adminAvenger.aiProviderSettings";

export const defaultAiProviderSettings: AiProviderSettings = {
  mode: "local_rules",
  ollamaUrl: "http://localhost:11434",
  ollamaModel: "qwen2.5:7b",
};

const isAiMode = (value: unknown): value is AiMode =>
  value === "local_rules" || value === "local_ollama";

export const loadAiProviderSettings = (): AiProviderSettings => {
  if (typeof window === "undefined") {
    return defaultAiProviderSettings;
  }

  try {
    const stored = window.localStorage.getItem(aiProviderSettingsKey);

    if (!stored) {
      return defaultAiProviderSettings;
    }

    const parsed = JSON.parse(stored) as Partial<AiProviderSettings>;

    return {
      mode: isAiMode(parsed.mode) ? parsed.mode : defaultAiProviderSettings.mode,
      ollamaUrl:
        typeof parsed.ollamaUrl === "string" && parsed.ollamaUrl.trim()
          ? parsed.ollamaUrl
          : defaultAiProviderSettings.ollamaUrl,
      ollamaModel:
        typeof parsed.ollamaModel === "string" && parsed.ollamaModel.trim()
          ? parsed.ollamaModel
          : defaultAiProviderSettings.ollamaModel,
    };
  } catch {
    return defaultAiProviderSettings;
  }
};

export const saveAiProviderSettings = (settings: AiProviderSettings) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(aiProviderSettingsKey, JSON.stringify(settings));
};
