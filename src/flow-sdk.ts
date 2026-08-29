/**
 * Deliberately structural: the live SDK object is supplied by the Flow Space
 * loader, so this public repository never stores a cookie, token, or API key.
 */
export interface FlowSong {
  id?: string;
  operationId?: string;
  title?: string;
  audioUrl?: string;
  duration?: number | null;
  coverImageUrl?: string | null;
  lyrics?: unknown | null;
  [key: string]: unknown;
}

export interface GenerateSongInput {
  soundPrompt: string;
  lyrics?: string;
  title?: string;
  seed?: number;
}

export interface FlowSdk {
  getSong?: (id: string) => Promise<FlowSong>;
  generateSong?: (input: GenerateSongInput) => Promise<FlowSong>;
  [key: string]: unknown;
}
