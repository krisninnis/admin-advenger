// Minimal ambient type declaration for mammoth (Document File Support v1).
// mammoth does not ship its own TypeScript types and there is no
// @types/mammoth package, so this declares only the small slice of its API
// AdminAvenger actually uses (src/lib/documentFileText.ts): local, in-browser
// plain-text extraction from a .docx file's raw bytes. Nothing here implies
// or enables any network/cloud behaviour - mammoth's extractRawText runs
// entirely against the ArrayBuffer it is given.
declare module "mammoth" {
  export type MammothMessage = {
    type: string;
    message: string;
  };

  export type ExtractRawTextInput = { arrayBuffer: ArrayBuffer } | { path: string };

  export type ExtractRawTextResult = {
    value: string;
    messages: MammothMessage[];
  };

  export function extractRawText(input: ExtractRawTextInput): Promise<ExtractRawTextResult>;
}
