export interface MentionInput {
  external_id: string;
  source: string;
  title: string | null;
  content: string;
  url: string;
  author: string | null;
  published_at: string | number | null;
  engagement: number | string;
}

export interface NormalizedMention {
  external_id: string;
  source: string;
  source_normalized: string;
  title: string | null;
  content: string;
  url: string;
  url_normalized: string;
  author: string | null;
  published_at: Date | null;
  engagement: number;
}
