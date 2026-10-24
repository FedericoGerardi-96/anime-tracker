export type Relationship = 'none' | 'friends' | 'request_sent' | 'request_received';
export type ConnectionDirection = 'friend' | 'sent' | 'received';
export type VisibilityLevel = 'public' | 'friends' | 'private';

export interface SocialProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar: string | null;
  bio: string | null;
  relationship: Relationship;
}

export interface SocialConnection {
  friendship_id: string;
  user_id: string;
  username: string;
  full_name: string | null;
  avatar: string | null;
  status: 'pending' | 'accepted';
  direction: ConnectionDirection;
  created_at: string;
}

export interface ProfilePrivacy {
  library_favorites_visibility: VisibilityLevel;
  featured_anime_visibility: VisibilityLevel;
  featured_manga_visibility: VisibilityLevel;
  featured_characters_visibility: VisibilityLevel;
}

