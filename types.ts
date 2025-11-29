export interface Movie {
  id: string;
  title: string;
  yearViewed: string; // "2019", "2020", etc.
  notes: string; // "IMAX", "Dolby Cinema", etc.
  category?: 'Standard' | 'Recut/Edit' | 'Leftover';
  
  // Metadata fetched via Gemini (Commentary)
  hasCommentary?: boolean;
  commentaryDetails?: string;
  releaseFormat?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  
  // Metadata fetched via Gemini (General Details)
  plot?: string;
  runtime?: string;
  rated?: string;
  posterUrl?: string;
  
  metadataLastUpdated?: number;
  isLoadingMetadata?: boolean;
  isLoadingDetails?: boolean;
}

export interface StatsData {
  name: string;
  count: number;
}