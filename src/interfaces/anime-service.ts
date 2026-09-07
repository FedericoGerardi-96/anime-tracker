export interface FavoriteMediaRow {
  media: { mal_id: number | string | null }
    | Array<{ mal_id: number | string | null }>
    | null;
}

export interface HentaiFavoriteRow {
  mal_id: number | string | null;
}
