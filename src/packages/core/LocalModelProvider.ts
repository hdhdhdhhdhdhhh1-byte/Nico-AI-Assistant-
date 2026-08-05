/**
 * LocalModelProvider — Abstract interface for on-device ML models (llama.cpp, Transformers.js, ONNX, WebLLM).
 * Provides a clean abstraction layer so local SLM/LLM models can be plugged in seamlessly.
 */

export interface ModelInferenceOptions {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ModelInferenceResult {
  text: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
  };
}

export interface ILocalModelBackend {
  id: string;
  name: string;
  isReady: boolean;
  init: () => Promise<boolean>;
  generate: (opts: ModelInferenceOptions) => Promise<ModelInferenceResult>;
}

/** Fallback rule-based local model backend when native binary weight is absent */
export class RuleBasedLocalBackend implements ILocalModelBackend {
  readonly id = "rule_based_engine";
  readonly name = "Local Nico Rule Engine";
  isReady = true;

  async init(): Promise<boolean> {
    return true;
  }

  async generate(opts: ModelInferenceOptions): Promise<ModelInferenceResult> {
    const prompt = opts.prompt;
    return {
      text: `[Local Engine]: تمت معالجة النص "${prompt.slice(0, 30)}..." بنجاح محلياً.`,
      usage: { promptTokens: prompt.length, completionTokens: 20 },
    };
  }
}

export class LocalModelProvider {
  private static activeBackend: ILocalModelBackend = new RuleBasedLocalBackend();

  static registerBackend(backend: ILocalModelBackend) {
    this.activeBackend = backend;
  }

  static getBackend(): ILocalModelBackend {
    return this.activeBackend;
  }

  static async generate(opts: ModelInferenceOptions): Promise<ModelInferenceResult> {
    if (!this.activeBackend.isReady) {
      await this.activeBackend.init();
    }
    return this.activeBackend.generate(opts);
  }
}
