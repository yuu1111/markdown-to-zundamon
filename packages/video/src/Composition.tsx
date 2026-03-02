import { CompositionPropsSchema } from "@markdown-to-zundamon/core/types";
import { getAvailableFonts } from "@remotion/google-fonts";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	AbsoluteFill,
	Html5Audio,
	Sequence,
	staticFile,
	useCurrentFrame,
	useDelayRender,
} from "remotion";
import { CharacterDisplay } from "./components/CharacterDisplay";
import { SlideContent } from "./components/SlideContent";
import { Subtitle } from "./components/Subtitle";

/**
 * @description 利用可能なフォントレジストリ(モジュールレベルで1回だけ取得)
 */
const AVAILABLE_FONTS = getAvailableFonts();

/**
 * @description Google Fonts を useDelayRender で非同期ロードし、解決済み CSS font-family 名を返す
 * @param fontNames - ロードするフォント名の配列
 * @returns フォント名 → CSS font-family のマップ
 */
function useGoogleFonts(fontNames: string[]): Map<string, string> {
	const { delayRender, continueRender, cancelRender } = useDelayRender();
	const [resolvedFonts, setResolvedFonts] = useState<Map<string, string>>(
		() => new Map(),
	);
	const handleRef = useRef<ReturnType<typeof delayRender> | null>(null);

	const uniqueNames = useMemo(
		() => [...new Set(fontNames)].sort(),
		[fontNames.join(",")],
	);
	const key = uniqueNames.join(",");

	useEffect(() => {
		if (uniqueNames.length === 0) return;

		const handle = delayRender(`Loading fonts: ${uniqueNames.join(", ")}`);
		handleRef.current = handle;

		Promise.all(
			uniqueNames.map(async (name) => {
				const font = AVAILABLE_FONTS.find((f) => f.fontFamily === name);
				if (!font) {
					console.warn(`Font "${name}" not found in @remotion/google-fonts`);
					return [name, name] as const;
				}
				const loaded = await font.load();
				await loaded
					.loadFont("normal", { weights: ["400", "700"] })
					.waitUntilDone();
				console.log(
					`Font loaded: "${name}" → CSS family "${loaded.fontFamily}"`,
				);
				return [name, loaded.fontFamily] as const;
			}),
		)
			.then((entries) => {
				setResolvedFonts(new Map(entries));
				continueRender(handle);
			})
			.catch((err) => {
				cancelRender(err);
			});
	}, [key]);

	return resolvedFonts;
}

export const ZundamonComposition: React.FC<Record<string, unknown>> = (
	props,
) => {
	const compositionProps = CompositionPropsSchema.parse(props);
	const { manifest } = compositionProps;
	if (!manifest) {
		throw new Error("manifest is not loaded yet");
	}
	const frame = useCurrentFrame();
	const { segments, config } = manifest;

	// Collect all font names to load
	const fontNames = [config.fontFamily];
	if (config.subtitleFontFamily) fontNames.push(config.subtitleFontFamily);
	if (config.slideFontFamily) fontNames.push(config.slideFontFamily);

	const resolvedFonts = useGoogleFonts(fontNames);

	const resolveFontFamily = (name: string) => resolvedFonts.get(name) ?? name;

	const baseFontFamily = resolveFontFamily(config.fontFamily);
	const subtitleFontFamily = resolveFontFamily(
		config.subtitleFontFamily ?? config.fontFamily,
	);
	const slideFontFamily = resolveFontFamily(
		config.slideFontFamily ?? config.fontFamily,
	);

	const timeline = useMemo(() => {
		const result: { segment: (typeof segments)[number]; startFrame: number }[] =
			[];
		let f = 0;
		for (const segment of segments) {
			result.push({ segment, startFrame: f });
			f += segment.durationInFrames;
		}
		return result;
	}, [segments]);

	let currentSlideMarkdown: string | null = null;
	let currentSpeechText: string | null = null;
	let currentSpeechCharacter: string | null = null;
	for (const entry of timeline) {
		if (entry.segment.type === "slide" && entry.startFrame <= frame) {
			currentSlideMarkdown = entry.segment.markdown ?? entry.segment.text;
		} else if (
			entry.segment.type === "speech" &&
			frame >= entry.startFrame &&
			frame < entry.startFrame + entry.segment.durationInFrames
		) {
			currentSpeechText = entry.segment.text;
			currentSpeechCharacter = entry.segment.character ?? null;
		}
	}

	// Resolve current speaker's color
	const currentCharConfig = currentSpeechCharacter
		? config.characters.find((c) => c.name === currentSpeechCharacter)
		: undefined;

	return (
		<AbsoluteFill
			style={{
				backgroundColor: "#e8f5e9",
				fontFamily: `'${baseFontFamily}', sans-serif`,
			}}
		>
			{/* Audio sequences */}
			{timeline.map(
				(entry, i) =>
					entry.segment.type === "speech" &&
					entry.segment.audioFile && (
						<Sequence
							key={i}
							from={entry.startFrame}
							durationInFrames={entry.segment.durationInFrames}
						>
							<Html5Audio src={staticFile(entry.segment.audioFile)} />
						</Sequence>
					),
			)}

			{/* Slide content */}
			{currentSlideMarkdown && (
				<SlideContent
					markdown={currentSlideMarkdown}
					fontFamily={slideFontFamily}
					codeHighlightTheme={config.codeHighlightTheme}
				/>
			)}

			{/* Characters */}
			{config.characters
				.filter((char) => char.hasImage !== false)
				.map((char) => (
					<CharacterDisplay
						key={char.name}
						isSpeaking={currentSpeechCharacter === char.name}
						imageSrc={`characters/${char.name}/default.png`}
						activeImageSrcs={char.activeImages?.map(
							(img) => `characters/${char.name}/${img}`,
						)}
						position={char.position}
						flip={char.flip}
						overflowBottom={char.overflowY}
						overflowSide={char.overflowX}
						height={char.height}
					/>
				))}

			{/* Subtitle */}
			{currentSpeechText && (
				<Subtitle
					text={currentSpeechText}
					fontFamily={subtitleFontFamily}
					strokeColor={currentCharConfig?.color}
				/>
			)}
		</AbsoluteFill>
	);
};
