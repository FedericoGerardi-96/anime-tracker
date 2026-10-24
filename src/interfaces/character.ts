export interface CharacterVoiceActor {
  id: number;
  name: string;
  nativeName?: string | null;
  image: string;
  language: string;
  url: string;
}

export interface AnimeCharacter {
  id: number;
  provider?: "anilist" | "myanimelist";
  malId?: number;
  name: string;
  nativeName?: string | null;
  alternativeNames: string[];
  image: string;
  description?: string | null;
  gender?: string | null;
  age?: string | null;
  favorites: number;
  url: string;
  role: "MAIN" | "SUPPORTING" | "BACKGROUND";
  voiceActors: CharacterVoiceActor[];
}

export interface CharacterSearchResult {
  characters: AnimeCharacter[];
  hasNextPage: boolean;
}

export interface CharacterAppearance {
  malId: number;
  title: string;
  image: string;
  type: "ANIME" | "MANGA";
  role?: string | null;
}

export interface CharacterDetail extends Omit<AnimeCharacter, "role" | "voiceActors"> {
  appearances: CharacterAppearance[];
  voiceActors: CharacterVoiceActor[];
  pictures?: string[];
  details?: Array<{ label: string; value: string }>;
  birthday?: string | null;
}
