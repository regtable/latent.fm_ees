/**
 * Deliberately structural: the live SDK object is supplied by the Flow Space
 * loader, so this public repository never stores a cookie, token, or API key.
 */
export interface ClipLyrics {
  text: string;
  timingMarkers: number[][] | null;
}

export interface FlowSong {
  id?: string;
  operationId?: string;
  title?: string;
  audioUrl?: string;
  duration?: number | null;
  coverImageUrl?: string | null;
  lyrics?: ClipLyrics | null;
  [key: string]: unknown;
}

export interface GenerateSongInput {
  soundPrompt: string;
  lyrics?: string;
  title?: string;
  seed?: number;
}

export interface ExtendSongInput {
  clipId: string;
  instruction: string;
  extendSeconds: number;
  extendFromSeconds?: number;
  title?: string;
  seed?: number;
}

export interface InpaintSongInput {
  clipId: string;
  instruction: string;
  regions: Array<{ startTime: number; endTime: number }>;
  title?: string;
  seed?: number;
}

export interface CoverSongInput {
  clipId: string;
  instruction: string;
  strength?: number;
  title?: string;
  seed?: number;
}

export interface SplitStemsResult {
  vocals: FlowSong;
  drums: FlowSong;
  bass: FlowSong;
  other: FlowSong;
}

export interface GenerateImageInput {
  prompt: string;
  aspectRatio?: "1:1" | "2:3" | "3:2" | "3:4" | "4:3" | "9:16" | "16:9";
  imageUrls?: string[];
}

export interface GenerateVideoInput {
  prompt: string;
  aspectRatio?: "16:9" | "9:16";
  duration?: 4 | 6 | 8;
}

export interface WriteLyricsResult {
  title: string;
  lyrics: string;
  soundPrompt: string;
}

export interface FlowSdk {
  getSong?: (id: string) => Promise<FlowSong>;
  generateSong?: (input: GenerateSongInput) => Promise<FlowSong>;
  extendSong?: (input: ExtendSongInput) => Promise<FlowSong>;
  inpaintSong?: (input: InpaintSongInput) => Promise<FlowSong>;
  coverSong?: (input: CoverSongInput) => Promise<FlowSong>;
  splitStems?: (input: { clipId: string }) => Promise<SplitStemsResult>;
  generateImage?: (input: GenerateImageInput) => Promise<{ imageUrl: string }>;
  generateVideo?: (input: GenerateVideoInput) => Promise<{ videoUrl: string }>;
  writeLyrics?: (input: { prompt: string }) => Promise<WriteLyricsResult>;
  [key: string]: unknown;
}
