import { env } from "@markdown-to-zundamon/core/config";
import type { Character } from "@markdown-to-zundamon/core/types";
import { CoeiroinkEngine } from "./coeiroink";
import { VoicevoxEngine } from "./voicevox";

/**
 * @description TTS エンジンの共通インターフェース
 */
export interface TtsEngine {
	/**
	 * @description キャラクターの TTS 設定を検証する
	 * @param character - 検証対象のキャラクター
	 * @throws 必要なフィールドが欠けている場合
	 */
	validateCharacter(character: Character): void;

	/**
	 * @description テキストを音声合成して WAV バイト列を返す
	 * @param text - 合成するテキスト
	 * @param character - キャラクター設定
	 * @returns WAV バイナリ
	 */
	synthesize(text: string, character: Character): Promise<ArrayBuffer>;
}

/**
 * @description エンジン名から TtsEngine インスタンスを生成する
 * @param engine - エンジン種別
 * @returns TtsEngine 実装
 */
export function createTtsEngine(engine: "voicevox" | "coeiroink"): TtsEngine {
	switch (engine) {
		case "voicevox":
			return new VoicevoxEngine(env.VOICEVOX_BASE);
		case "coeiroink":
			return new CoeiroinkEngine(env.COEIROINK_BASE);
	}
}
