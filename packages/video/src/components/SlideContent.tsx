import { type FC, useEffect, useRef, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Img, staticFile, useDelayRender } from "remotion";
import { createHighlighter, type Highlighter } from "shiki";

/**
 * @description プリロードする言語一覧
 */
const PRELOADED_LANGS = [
	"javascript",
	"typescript",
	"jsx",
	"tsx",
	"python",
	"go",
	"rust",
	"java",
	"c",
	"cpp",
	"csharp",
	"json",
	"yaml",
	"toml",
	"bash",
	"shell",
	"powershell",
	"html",
	"css",
	"sql",
	"markdown",
	"xml",
	"diff",
] as const;

/**
 * @description Shikiハイライターを非同期ロードし、delayRenderで待機する
 * @param theme - Shikiテーマ名
 * @returns ロード済みのHighlighterインスタンス(ロード中はnull)
 */
function useShikiHighlighter(theme: string): Highlighter | null {
	const { delayRender, continueRender, cancelRender } = useDelayRender();
	const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
	const handleRef = useRef<ReturnType<typeof delayRender> | null>(null);

	useEffect(() => {
		const handle = delayRender(`Loading Shiki highlighter: ${theme}`);
		handleRef.current = handle;

		createHighlighter({
			themes: [theme],
			langs: [...PRELOADED_LANGS],
		})
			.then((h) => {
				setHighlighter(h);
				continueRender(handle);
			})
			.catch((err) => {
				cancelRender(err);
			});
	}, [theme]);

	return highlighter;
}

/**
 * @description SlideContentコンポーネントのprops
 * @property markdown - 表示するMarkdown文字列
 * @property fontFamily - フォントファミリー
 * @property codeHighlightTheme - Shikiテーマ名 @optional @default "one-light"
 */
interface Props {
	markdown: string;
	fontFamily: string;
	codeHighlightTheme?: string;
}

export const SlideContent: FC<Props> = ({
	markdown,
	fontFamily,
	codeHighlightTheme = "one-light",
}) => {
	const highlighter = useShikiHighlighter(codeHighlightTheme);

	return (
		<div
			style={{
				position: "absolute",
				top: 40,
				left: 60,
				right: 60,
				bottom: 180,
				display: "flex",
				alignItems: "center",
			}}
		>
			<div
				style={{
					backgroundColor: "rgba(255, 255, 255, 0.92)",
					borderRadius: 24,
					padding: "48px 60px",
					fontSize: 52,
					lineHeight: 1.8,
					color: "#333",
					boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
					width: "100%",
					minHeight: "75%",
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					fontFamily: `${fontFamily}, sans-serif`,
				}}
			>
				<Markdown
					remarkPlugins={[remarkGfm]}
					components={{
						h1: ({ children }) => (
							<div
								style={{
									fontSize: 72,
									fontWeight: 700,
									marginBottom: 24,
								}}
							>
								{children}
							</div>
						),
						h2: ({ children }) => (
							<div
								style={{
									fontSize: 60,
									fontWeight: 700,
									marginBottom: 20,
								}}
							>
								{children}
							</div>
						),
						h3: ({ children }) => (
							<div
								style={{
									fontSize: 52,
									fontWeight: 700,
									marginBottom: 16,
								}}
							>
								{children}
							</div>
						),
						p: ({ children }) => (
							<div
								style={{
									marginBottom: 16,
									display: "flex",
									flexWrap: "wrap",
									alignItems: "center",
									gap: 16,
								}}
							>
								{children}
							</div>
						),
						ul: ({ children }) => (
							<div style={{ paddingLeft: 40 }}>{children}</div>
						),
						ol: ({ children }) => (
							<div style={{ paddingLeft: 40 }}>{children}</div>
						),
						li: ({ children }) => (
							<div style={{ marginBottom: 12, display: "flex", gap: 16 }}>
								<span>•</span>
								<span>{children}</span>
							</div>
						),
						strong: ({ children }) => (
							<span style={{ fontWeight: 700, color: "#2e7d32" }}>
								{children}
							</span>
						),
						pre: ({ children }) => <>{children}</>,
						code: ({ className, children }) => {
							const match = /language-(\w+)/.exec(className ?? "");
							if (match && highlighter) {
								const lang = match[1] as string;
								const loadedLangs = highlighter.getLoadedLanguages();
								const effectiveLang = loadedLangs.includes(lang)
									? lang
									: "plaintext";
								const html = highlighter.codeToHtml(
									String(children).replace(/\n$/, ""),
									{
										lang: effectiveLang,
										theme: codeHighlightTheme,
									},
								);
								return (
									<div
										dangerouslySetInnerHTML={{ __html: html }}
										style={{
											borderRadius: 12,
											fontSize: "0.75em",
											lineHeight: 1.5,
											marginBottom: 16,
											overflow: "hidden",
										}}
									/>
								);
							}
							return (
								<span
									style={{
										backgroundColor: "rgba(0,0,0,0.06)",
										borderRadius: 8,
										padding: "4px 12px",
										fontFamily: "monospace",
										fontSize: "0.9em",
									}}
								>
									{children}
								</span>
							);
						},
						img: ({ src, alt }) => (
							<Img
								src={src ? staticFile(src) : ""}
								alt={alt ?? ""}
								style={{
									maxWidth: "100%",
									maxHeight: 500,
									objectFit: "contain",
									borderRadius: 12,
								}}
							/>
						),
					}}
				>
					{markdown}
				</Markdown>
			</div>
		</div>
	);
};
