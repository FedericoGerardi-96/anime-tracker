export interface IFavorites {
    id:    string;
    media: Media | Media[];
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
}
