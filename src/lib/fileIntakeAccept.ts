// Shared `accept` attribute strings for the photo/file intake controls.
// Centralised here so the compact "Add photo or file" control and the
// larger mode-card file inputs always agree on what they accept, and so
// the values can be unit tested without mounting any React components.

export const photoAcceptAttribute = "image/*";

export const textFileAcceptAttribute =
  ".txt,.md,.csv,.json,.pdf,.doc,.docx,text/plain,text/markdown,text/csv,application/json";

// Used by the compact "Upload file" quick action, which accepts either a
// photo or a document and routes to the right handler based on the file it
// receives.
export const quickUploadAcceptAttribute = `${photoAcceptAttribute},${textFileAcceptAttribute}`;
