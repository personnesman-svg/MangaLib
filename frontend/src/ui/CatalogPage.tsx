import { useEffect, useState } from 'react';
import { Alert, Button, Empty, Input, Select, Skeleton, Space, Typography, Pagination } from 'antd';
import { SearchOutlined, SlidersOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { getGenres, getTitles } from '../api/client';

export function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [status, setStatus] = useState(params.get('status') ?? '');
  const [sort, setSort] = useState(params.get('sort') ?? 'updated');
  const [genre, setGenre] = useState(params.get('genre') ?? '');
  const [type, setType] = useState(params.get('type') ?? '');
  useEffect(() => {
    setSearch(params.get('search') ?? '');
    setStatus(params.get('status') ?? '');
    setGenre(params.get('genre') ?? '');
    setType(params.get('type') ?? '');
    setSort(params.get('sort') ?? 'updated');
  }, [params]);
  const genres = useQuery({ queryKey: ['genres'], queryFn: getGenres, staleTime: 60_000 });
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['titles', params.toString()],
    queryFn: () => getTitles({
      search: params.get('search') || undefined,
      status: params.get('status') || undefined,
      sort: params.get('sort') || undefined,
      genre: params.get('genre') || undefined,
      type: params.get('type') || undefined,
      page: Number(params.get('page') || 1),
    }),
  });

  function applyFilters() {
    const next = new URLSearchParams();
    if (search.trim()) next.set('search', search.trim());
    if (status) next.set('status', status);
    if (genre) next.set('genre', genre);
    if (type) next.set('type', type);
    if (sort !== 'updated') next.set('sort', sort);
    setParams(next);
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <div className="hero-copy">
          <Typography.Text className="eyebrow">ТВОЯ БИБЛИОТЕКА</Typography.Text>
          <Typography.Title className="hero-title">Найди свою<br /><span>следующую историю.</span></Typography.Title>
          <Typography.Paragraph className="hero-description">
            Каталог, главы и чтение в одном месте. Добавляй любимые тайтлы через панель управления.
          </Typography.Paragraph>
        </div>
        <div className="hero-mark" aria-hidden="true">漫</div>
      </section>

      <div className="section-heading">
        <div>
          <Typography.Title level={2}>Каталог</Typography.Title>
          <Typography.Text type="secondary">{data?.total ?? 0} тайтлов в библиотеке</Typography.Text>
        </div>
        <Space wrap>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={applyFilters}
            placeholder="Название тайтла"
            prefix={<SearchOutlined />}
            allowClear
          />
          <Select
            value={status || undefined}
            onChange={(value) => setStatus(value ?? '')}
            placeholder="Все статусы"
            allowClear
            options={[
              { value: 'ongoing', label: 'Выходит' },
              { value: 'completed', label: 'Завершена' },
              { value: 'hiatus', label: 'Пауза' },
              { value: 'cancelled', label: 'Отменена' },
            ]}
          />
          <Select value={genre || undefined} onChange={(value) => setGenre(value ?? '')} placeholder="Все жанры" allowClear loading={genres.isLoading} options={(genres.data ?? []).map((item) => ({ value: item.slug, label: item.name }))} />
          <Select value={type || undefined} onChange={(value) => setType(value ?? '')} placeholder="Все типы" allowClear options={[{ value: 'manga', label: 'Манга' }, { value: 'manhwa', label: 'Манхва' }, { value: 'manhua', label: 'Маньхуа' }, { value: 'webtoon', label: 'Вебтун' }, { value: 'comic', label: 'Комикс' }, { value: 'novel', label: 'Ранобэ / новелла' }]} />
          <Select value={sort} onChange={setSort} options={[{ value: 'updated', label: 'Сначала обновлённые' }, { value: 'popular', label: 'Популярные' }, { value: 'name', label: 'По названию' }]} />
          <Button type="primary" icon={<SlidersOutlined />} onClick={applyFilters}>Применить</Button>
        </Space>
      </div>

      {isError && <Alert type="error" showIcon message="Не удалось загрузить каталог"
        description={error instanceof Error ? error.message : 'Проверь API и подключение к серверу.'}
        action={<Button size="small" onClick={() => void refetch()}>Повторить</Button>} />}

      {isLoading ? <Skeleton active paragraph={{ rows: 4 }} /> : null}

      {!isLoading && !isError && (data?.data.length ?? 0) === 0 && (
        <div className="empty-panel">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span>{params.toString() ? 'По заданным фильтрам ничего не найдено.' : 'Каталог пока пуст. Добавь первый тайтл через админку.'}</span>}
          />
        </div>
      )}

      {!isLoading && (data?.data.length ?? 0) > 0 && <>
        <div className="manga-grid">
          {data?.data.map((title) => (
            <Link className="manga-card" to={`/title/${title.slug}`} key={title.id}>
              <div className="cover-frame">
                {title.cover_url
                  ? <img src={title.cover_url} alt={title.name} loading="lazy" />
                  : <div className="cover-placeholder">Обложка<br />не загружена</div>}
              </div>
              <div className="manga-card-copy">
                <strong>{title.name}</strong>
                <span>{title.latest_chapter ? `Глава ${title.latest_chapter}` : 'Глав пока нет'}</span>
              </div>
            </Link>
          ))}
        </div>
        {(data?.total ?? 0) > (data?.per_page ?? 24) && <Pagination
          className="catalog-pagination"
          current={Number(params.get('page') || 1)}
          pageSize={data?.per_page ?? 24}
          total={data?.total ?? 0}
          showSizeChanger={false}
          onChange={(page) => { const next = new URLSearchParams(params); next.set('page', String(page)); setParams(next); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
        />}
      </>}
    </div>
  );
}
