import type React from "react";
import Markdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import * as prismStyles from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { Img, staticFile } from "remotion";

type PrismStyle = Record<string, React.CSSProperties>;
const THEMES: Record<string, PrismStyle> = prismStyles as unknown as Record<
	string,
	PrismStyle
>;

interface Props {
	markdown: string;
	fontFamily: string;
	codeHighlightTheme?: string;
}

export const SlideContent: React.FC<Props> = ({
	markdown,
	fontFamily,
	codeHighlightTheme = "oneLight",
}) => {
	const codeStyle = THEMES[codeHighlightTheme] ?? THEMES.oneLight;
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
							if (match) {
								return (
									<SyntaxHighlighter
										language={match[1]}
										style={codeStyle}
										customStyle={{
											borderRadius: 12,
											fontSize: "0.75em",
											lineHeight: 1.5,
											marginBottom: 16,
										}}
									>
										{String(children).replace(/\n$/, "")}
									</SyntaxHighlighter>
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
