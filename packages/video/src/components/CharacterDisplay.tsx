import type React from "react";
import { Img, staticFile, useCurrentFrame } from "remotion";

interface Props {
	isSpeaking: boolean;
	imageSrc: string;
	/** Active (lip-sync) image sources to alternate between when speaking */
	activeImageSrcs?: string[];
	position?: "left" | "right";
	flip?: boolean;
	/** How much of the image extends below the viewport (0-1). Default: 0.3 */
	overflowBottom?: number;
	/** How much of the image extends beyond the viewport edge (0-1). Default: 0.1 */
	overflowSide?: number;
	/** Image height in px. Default: 800 */
	height?: number;
}

export const CharacterDisplay: React.FC<Props> = ({
	isSpeaking,
	imageSrc,
	activeImageSrcs,
	position = "right",
	flip = false,
	overflowBottom = 0.3,
	overflowSide = 0.1,
	height = 800,
}) => {
	const frame = useCurrentFrame();
	// Subtle bounce animation when speaking
	const offsetY = isSpeaking ? Math.sin(frame * 0.3) * 5 : 0;

	// Lip-sync: alternate between active images every 4 frames, fall back to default when not speaking
	let displayImageSrc = imageSrc;
	if (isSpeaking && activeImageSrcs && activeImageSrcs.length > 0) {
		const index = Math.floor(frame / 4) % activeImageSrcs.length;
		displayImageSrc = activeImageSrcs[index] ?? imageSrc;
	}

	const positionStyle =
		position === "right"
			? { right: -(height * overflowSide) }
			: { left: -(height * overflowSide) };

	const scaleX = flip ? -1 : 1;

	return (
		<div
			style={{
				position: "absolute",
				bottom: -(height * overflowBottom),
				transform: `translateY(${offsetY}px) scaleX(${scaleX})`,
				...positionStyle,
			}}
		>
			<Img
				src={staticFile(displayImageSrc)}
				style={{
					height,
					objectFit: "contain",
				}}
			/>
		</div>
	);
};
