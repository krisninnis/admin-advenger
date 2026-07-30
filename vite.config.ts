import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { buildWalkingSkeletonRuntimeAsset } from "./src/lib/estateAdministrationKnowledge/walkingSkeletonGovernance.ts";

const estateAdministrationKnowledgeAsset = (): Plugin => ({
  name: "estate-administration-hidden-knowledge-asset",
  apply: "build",
  generateBundle() {
    const buildDate = new Date().toISOString().slice(0, 10);
    const result = buildWalkingSkeletonRuntimeAsset(buildDate);

    if (result.validationIssues.length > 0) {
      const messages = result.validationIssues
        .map((candidate) => `${candidate.code}: ${candidate.path}`)
        .join(", ");
      throw new Error(
        `Estate Administration knowledge validation failed: ${messages}`,
      );
    }

    if (result.bundle.artifact.entries.length !== 0) {
      throw new Error(
        "The hidden Estate Administration walking skeleton must not emit a public runtime entry.",
      );
    }

    this.emitFile({
      type: "asset",
      fileName: "assets/estate-administration-knowledge-runtime.json",
      source: result.serializedArtifact,
    });
  },
});

export default defineConfig({
  plugins: [react(), tailwindcss(), estateAdministrationKnowledgeAsset()],
});
