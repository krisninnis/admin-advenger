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

// Used by the "Upload existing photo" option inside the camera capture panel
// (src/components/PhotoCapturePanel.tsx). Deliberately narrower than the
// generic photoAcceptAttribute ("image/*") so the file picker only offers
// formats AdminAvenger can actually try to read, including the HEIC/HEIF
// formats modern phone cameras commonly save photos as.
export const photoCaptureAcceptAttribute = "image/png,image/jpeg,image/webp,image/heic,image/heif";
