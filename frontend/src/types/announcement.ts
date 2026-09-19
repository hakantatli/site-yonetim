export type AnnouncementPriority = 'normal' | 'important' | 'urgent';

export interface Announcement {
  id: string;
  site_id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  published_at: string;
  created_by: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAnnouncementPayload {
  title: string;
  content: string;
  priority: AnnouncementPriority;
}

export interface UpdateAnnouncementPayload {
  title: string;
  content: string;
  priority: AnnouncementPriority;
}
