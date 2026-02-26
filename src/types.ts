import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  bio: string;
  profile_pic: string;
  is_private: boolean;
  is_verified: boolean;
  is_admin: boolean;
  is_suspended: boolean;
  created_at: string;
  postsCount?: number;
  followersCount?: number;
  followingCount?: number;
}

export interface Post {
  id: number;
  user_id: number;
  username: string;
  profile_pic: string;
  is_verified: boolean;
  image_url: string;
  media_type: 'image' | 'video';
  music_title?: string;
  youtube_id?: string;
  caption: string;
  likes_count: number;
  has_liked: boolean;
  views: number;
  created_at: string;
}

export interface Story {
  id: number;
  user_id: number;
  username: string;
  profile_pic: string;
  image_url: string;
  media_type: 'image' | 'video';
  music_title?: string;
  youtube_id?: string;
  expires_at: string;
  created_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}
