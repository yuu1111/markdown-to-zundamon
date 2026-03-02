import type { Character } from "@markdown-to-zundamon/core/types";
import type { TtsEngine } from "./engine";

/**
 * @description Coeiroink API を使用した TTS エンジン実装
 */
export class CoeiroinkEngine implements TtsEngine {
	readonly name = "coeiroink" as const;

	/**
	 * @description CoeiroinkEngine を初期化する
	 * @param baseUrl - Coeiroink API のベース URL
	 */
	constructor(private readonly baseUrl: string) {}

	/**
	 * @description キャラクターに speakerUuid と styleId が設定されているか検証する
	 * @param character - 検証対象のキャラクター
	 */
	validateCharacter(character: Character): void {
		if (!character.speakerUuid || character.styleId == null) {
			throw new Error(
				`Coeiroink エンジンではキャラクター "${character.name}" に speakerUuid と styleId が必要です。\n` +
					`  frontmatter の characters で speakerUuid と styleId を指定してください。`,
			);
		}
	}

	/**
	 * @description Coeiroink API でテキストを音声合成する
	 * @param text - 合成するテキスト
	 * @param character - キャラクター設定
	 * @returns WAV バイナリ
	 */
	async synthesize(text: string, character: Character): Promise<ArrayBuffer> {
		const speakerUuid = character.speakerUuid as string;
		const styleId = character.styleId as number;

		let synthRes: Response;
		try {
			synthRes = await fetch(`${this.baseUrl}/v1/synthesis`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					speakerUuid,
					styleId,
					text,
					speedScale: 1.0,
					volumeScale: 1.0,
					pitchScale: 0,
					intonationScale: 1.0,
					prePhonemeLength: 0.1,
					postPhonemeLength: 0.1,
					outputSamplingRate: 44100,
				}),
			});
		} catch (err) {
			throw new Error(
				`Coeiroink に接続できません (${this.baseUrl})\n` +
					`  Coeiroink が起動しているか確認してください。\n` +
					`  別のホストで動いている場合は環境変数 COEIROINK_BASE を設定してください。\n` +
					`  例: COEIROINK_BASE=http://192.168.1.100:50032 bun run preprocess -- ...\n` +
					`  原因: ${err instanceof Error ? err.message : err}`,
			);
		}
		if (!synthRes.ok) {
			const body = await synthRes.text();
			throw new Error(
				`Coeiroink synthesis が失敗しました (speakerUuid=${speakerUuid}, styleId=${styleId})\n` +
					`  ステータス: ${synthRes.status}\n` +
					`  レスポンス: ${body}`,
			);
		}

		return await synthRes.arrayBuffer();
	}
}
