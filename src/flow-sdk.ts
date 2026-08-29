/**
 * Deliberately structural: the live SDK object is supplied by the Flow Space
 * loader, so this public repository never stores a cookie, token, or API key.
 */
export interface FlowSong {
  id?: string;
  title?: string;
  audioUrl?: string;
  [key: string]: unknown;
}

export interface GenerateSongInput {
  prompt?: string;
  sound?: string;
  lyrics?: string;
  [key: string]: unknown;
}

export interface FlowSdk {
  getSong?: (id: string) => Promise<FlowSong>;
  generateSong?: (input: GenerateSongInput) => Promise<unknown>;
  [key: string]: unknown;
}
