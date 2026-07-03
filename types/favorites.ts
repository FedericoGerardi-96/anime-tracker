export interface IFavorites {
    id:    string;
    media: Media | Media[];
    user_metadata?: IUserMediaMetadata | null;
    progress?: {
        status: string;
        current_episode: number;
    } | null;
}

export interface Media {
    id:          string;
    tags:        string[];
    type:        string;
    image:       string;
    title:       string;
    mal_id:      number;
    season:      string;
    description: string;
    score?:      number;
}

export interface IUserMediaMetadata {
    id?: string;
    user_id?: string;
    media_id: string;
    custom_description?: string | null;
    watch_link?: string | null;
    custom_tags?: string[];
}
