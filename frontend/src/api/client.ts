import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: { Accept: 'application/json' },
  timeout: 30_000,
  withCredentials: true,
  withXSRFToken: true,
});

export async function csrf() {
  await axios.get('/sanctum/csrf-cookie', { withCredentials: true, withXSRFToken: true });
}

export type Paginated<T> = {
  current_page: number;
  data: T[];
  first_page_url: string | null;
  from: number | null;
  last_page: number;
  last_page_url: string | null;
  links: Array<{ url: string | null; label: string; page: number | null; active: boolean }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
};
export type MangaContentType = 'manga' | 'manhwa' | 'manhua' | 'comic' | 'webtoon' | 'novel';
export type MangaAgeRating = 'all' | '12+' | '16+' | '18+';
export type MangaTitle = {
  id: number; slug: string; name: string; description: string | null; cover_url: string | null;
  original_name: string | null; alternative_names: string[]; author: string | null; artist: string | null;
  release_year: number | null; content_type: MangaContentType; age_rating: MangaAgeRating; is_colored: boolean;
  status: 'ongoing' | 'completed' | 'hiatus' | 'cancelled'; genres: string[];
  latest_chapter: string | null; view_count?: number; updated_at: string;
};
export type Chapter = { id: number; number: string; name: string | null; published_at: string | null; pages_count?: number };
export type TitleDetails = Omit<MangaTitle, 'latest_chapter' | 'updated_at'> & { latest_chapter: string | null; updated_at: string; chapters: Chapter[] };
export type Genre = { id: number; name: string; slug: string; titles_count?: number };
export async function getGenres() {
  const response = await api.get<{ data: Genre[] }>('/genres'); return response.data.data;
}
export async function getTitles(params: Record<string, string | number | undefined> = {}) {
  const response = await api.get<Paginated<MangaTitle>>('/titles', { params }); return response.data;
}
export async function getTitle(slug: string) {
  const response = await api.get<{ data: TitleDetails }>(`/titles/${encodeURIComponent(slug)}`); return response.data.data;
}
export type ReaderData = {
  chapter: { id: number; number: string; name: string | null }; title: { id: number; slug: string; name: string };
  pages: { id: number; number: number; url: string }[];
  previous_chapter_id: number | null; next_chapter_id: number | null; resume_page_number?: number;
};
export async function getReader(chapterId: string | number) {
  const response = await api.get<{ data: ReaderData }>(`/chapters/${chapterId}`); return response.data.data;
}
