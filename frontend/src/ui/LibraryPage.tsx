import { Alert, Empty, Skeleton, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

type LibraryResponse = {
  bookmarks: { id: number; slug: string; name: string; cover_url: string | null; status: string; latest_chapter: string | null }[];
  history: { title: { id: number; slug: string; name: string; cover_url: string | null }; chapter: { id: number; number: string } | null; page_number: number; last_read_at: string | null }[];
};
export function LibraryPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['library'], queryFn: async () => (await api.get<LibraryResponse>('/library')).data });
  if (isLoading) return <Skeleton active />;
  if (isError || !data) return <Alert type="error" showIcon message="Не удалось загрузить библиотеку. Войди в аккаунт и повтори попытку." />;
  return <div className="page-stack">
    <section><Typography.Title>Моя библиотека</Typography.Title><Typography.Paragraph type="secondary">Закладки и история чтения хранятся в твоём аккаунте.</Typography.Paragraph>
      {data.bookmarks.length ? <div className="manga-grid">{data.bookmarks.map((item) => <Link className="manga-card" to={`/title/${item.slug}`} key={item.id}><div className="cover-frame">{item.cover_url ? <img src={item.cover_url} alt={item.name} loading="lazy" /> : <div className="cover-placeholder">Обложка не загружена</div>}</div><div className="manga-card-copy"><strong>{item.name}</strong><span>{item.latest_chapter ? `Глава ${item.latest_chapter}` : 'Глав пока нет'}</span></div></Link>)}</div> : <Empty description="Закладок пока нет." />}
    </section>
    <section><Typography.Title level={2}>История чтения</Typography.Title>
      {data.history.length ? data.history.map((item, i) => <div className="chapter-row" key={`${item.title.id}-${i}`}><span><Link to={`/title/${item.title.slug}`}>{item.title.name}</Link>{item.chapter ? ` · глава ${item.chapter.number}, страница ${item.page_number}` : ''}</span>{item.chapter && <Link to={`/read/${item.chapter.id}`}>Продолжить</Link>}</div>) : <Empty description="История чтения пуста." />}
    </section>
  </div>;
}
