import * as fs from "node:fs";
import * as path from "node:path";

/**
 * @description テキストの SHA256 ハッシュの先頭8文字を返す
 * @param text - ハッシュ対象のテキスト
 * @returns 8文字のハッシュ文字列
 */
export function shortHash(text: string): string {
	return new Bun.CryptoHasher("sha256").update(text).digest("hex").slice(0, 8);
}

/**
 * @description リモート画像をダウンロードしてハッシュ付きファイル名で保存する
 * @param url - ダウンロード元 URL
 * @param destDir - 保存先ディレクトリ
 * @returns 保存されたファイル名(ディレクトリ含まず)。失敗時は null
 */
export async function downloadRemoteImage(
	url: string,
	destDir: string,
): Promise<string | null> {
	const hash = shortHash(url);
	const urlPath = new URL(url).pathname;
	const ext = path.extname(urlPath) || ".jpg";
	const destName = `${hash}${ext}`;

	fs.mkdirSync(destDir, { recursive: true });
	const destPath = path.join(destDir, destName);

	if (await Bun.file(destPath).exists()) {
		return destName;
	}

	try {
		const res = await fetch(url);
		if (!res.ok) {
			console.warn(`  [warn] Failed to download image: ${url}`);
			return null;
		}
		await Bun.write(destPath, await res.arrayBuffer());
		return destName;
	} catch (err) {
		console.warn(`  [warn] Error downloading image: ${url}`, err);
		return null;
	}
}

/**
 * @description ローカル画像をハッシュ付きファイル名でコピーする
 * @param srcPath - コピー元ファイルパス
 * @param destDir - コピー先ディレクトリ
 * @returns コピー先のファイル名(ディレクトリ含まず)
 */
export async function copyLocalImage(
	srcPath: string,
	destDir: string,
): Promise<string> {
	const hash = shortHash(srcPath);
	const ext = path.extname(srcPath);
	const baseName = path.basename(srcPath, ext);
	const destName = `${hash}-${sanitizeForFilename(baseName)}${ext}`;

	fs.mkdirSync(destDir, { recursive: true });
	const destPath = path.join(destDir, destName);
	await Bun.write(destPath, Bun.file(srcPath));
	return destName;
}

/**
 * @description ファイル名として安全な文字列に変換する
 * @param text - 変換対象のテキスト
 * @returns サニタイズされた文字列
 */
export function sanitizeForFilename(text: string): string {
	return text
		.slice(0, 20)
		.replace(/[/\\:*?"<>|.\s]/g, "_")
		.replace(/_+/g, "_")
		.replace(/_$/, "");
}
