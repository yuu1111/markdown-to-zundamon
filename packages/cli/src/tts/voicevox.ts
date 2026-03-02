import type { Character } from "@markdown-to-zundamon/core/types";
import type { TtsEngine } from "./engine";

/**
 * @description VOICEVOX API を使用した TTS エンジン実装
 */
export class VoicevoxEngine implements TtsEngine {
	readonly name = "voicevox" as const;

	/**
	 * @description VoicevoxEngine を初期化する
	 * @param baseUrl - VOICEVOX API のベース URL
	 */
	constructor(private readonly baseUrl: string) {}

	/**
	 * @description キャラクターに speakerId が設定されているか検証する
	 * @param character - 検証対象のキャラクター
	 */
	validateCharacter(character: Character): void {
		if (character.speakerId == null) {
			throw new Error(
				`VOICEVOX エンジンではキャラクター "${character.name}" に speakerId が必要です。\n` +
					`  frontmatter の characters で speakerId を指定してください。`,
			);
		}
	}

	/**
	 * @description VOICEVOX API でテキストを音声合成する
	 * @param text - 合成するテキスト
	 * @param character - キャラクター設定
	 * @returns WAV バイナリ
	 */
	async synthesize(text: string, character: Character): Promise<ArrayBuffer> {
		const speakerId = character.speakerId as number;

		let queryRes: Response;
		try {
			queryRes = await fetch(
				`${this.baseUrl}/audio_query?text=${encodeURIComponent(text)}&speaker=${speakerId}`,
				{ method: "POST" },
			);
		} catch (err) {
			throw new Error(
				`VOICEVOX に接続できません (${this.baseUrl})\n` +
					`  VOICEVOX が起動しているか確認してください。\n` +
					`  別のホストで動いている場合は環境変数 VOICEVOX_BASE を設定してください。\n` +
					`  例: VOICEVOX_BASE=http://192.168.1.100:50021 bun run preprocess -- ...\n` +
					`  原因: ${err instanceof Error ? err.message : err}`,
			);
		}
		if (!queryRes.ok) {
			const body = await queryRes.text();
			throw new Error(
				`VOICEVOX audio_query が失敗しました (speaker=${speakerId}, text="${text.slice(0, 30)}...")\n` +
					`  ステータス: ${queryRes.status}\n` +
					`  レスポンス: ${body}`,
			);
		}
		const audioQuery = await queryRes.json();

		let synthRes: Response;
		try {
			synthRes = await fetch(`${this.baseUrl}/synthesis?speaker=${speakerId}`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(audioQuery),
			});
		} catch (err) {
			throw new Error(
				`VOICEVOX synthesis リクエストに失敗しました (${this.baseUrl})\n` +
					`  原因: ${err instanceof Error ? err.message : err}`,
			);
		}
		if (!synthRes.ok) {
			const body = await synthRes.text();
			throw new Error(
				`VOICEVOX synthesis が失敗しました (speaker=${speakerId})\n` +
					`  ステータス: ${synthRes.status}\n` +
					`  レスポンス: ${body}`,
			);
		}

		return await synthRes.arrayBuffer();
	}
}
