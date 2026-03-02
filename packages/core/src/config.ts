import { z } from "zod";

/**
 * @description 環境変数のバリデーションスキーマ
 * @property VOICEVOX_BASE - VOICEVOX API のベース URL @default "http://localhost:50021"
 * @property COEIROINK_BASE - Coeiroink API のベース URL @default "http://localhost:50032"
 * @property LLM_MODEL - LLM モデル指定 @default "google:gemini-2.5-flash"
 */
const EnvSchema = z.object({
	VOICEVOX_BASE: z.string().url().default("http://localhost:50021"),
	COEIROINK_BASE: z.string().url().default("http://localhost:50032"),
	LLM_MODEL: z.string().default("google:gemini-2.5-flash"),
});

/**
 * @description バリデーション済み環境変数
 */
export const env = EnvSchema.parse(process.env);
