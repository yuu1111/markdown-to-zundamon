import type React from "react";
import { Composition, staticFile } from "remotion";
import { ZundamonComposition } from "./Composition";
import { CompositionPropsSchema, ManifestSchema } from "./types";

export const RemotionRoot: React.FC = () => {
	return (
		<Composition
			schema={CompositionPropsSchema}
			id="ZundamonVideo"
			component={ZundamonComposition}
			durationInFrames={1}
			fps={30}
			width={1920}
			height={1080}
			defaultProps={{
				projectName: "example",
			}}
			calculateMetadata={async (options) => {
				const props = CompositionPropsSchema.parse(options.props);
				const url = staticFile(`projects/${props.projectName}/manifest.json`);
				const res = await fetch(url);
				if (!res.ok) {
					throw new Error(
						`Failed to load manifest for project "${props.projectName}" (${res.status}). ` +
							`Run: npm run preprocess -- <your-markdown-file.md>`,
					);
				}
				const manifest = ManifestSchema.parse(await res.json());
				return {
					durationInFrames: manifest.totalDurationInFrames,
					fps: manifest.config.fps,
					width: manifest.config.width,
					height: manifest.config.height,
					props: { ...props, manifest },
				};
			}}
		/>
	);
};
