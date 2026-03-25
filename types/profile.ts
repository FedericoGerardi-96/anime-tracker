export interface IProfile {
    id:              string;
    full_name:       string;
    avatar:          string;
    is_active:       boolean;
    roles:           string[];
    updated_at:      Date;
    show_h_content:  boolean;
}
