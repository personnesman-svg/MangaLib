import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Select, Skeleton, Space, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, SettingOutlined } from '@ant-design/icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, getReader } from '../api/client';
import { useAuth } from '../auth/AuthProvider';

export function ReaderPage() {
  const { chapterId = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [width, setWidth] = useState('900');
  const [mode, setMode] = useState<'scroll' | 'page'>('scroll');
  const [pageNumber, setPageNumber] = useState(1);
  const [readerReady, setReaderReady] = useState(false);
  const sentProgress = useRef(0);
  const { data, isLoading, isError } = useQuery({ queryKey: ['reader', chapterId], queryFn: () => getReader(chapterId) });
  useEffect(() => {
    setReaderReady(false);
    const resume = data?.resume_page_number ?? 1;
    setPageNumber(resume); sentProgress.current = resume;
    if (!data) return;
    const readyFrame = window.requestAnimationFrame(() => setReaderReady(true));
    return () => window.cancelAnimationFrame(readyFrame);
  }, [chapterId, data?.resume_page_number]);
  useEffect(() => {
    if (!data || mode !== 'scroll' || !data.resume_page_number || data.resume_page_number <= 1) return;
    const frame = window.requestAnimationFrame(() => document.querySelector(`[data-reader-page="${data.resume_page_number}"]`)?.scrollIntoView({ block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [data, mode]);
  useEffect(() => {
    if (!data || mode !== 'scroll' || typeof IntersectionObserver === 'undefined') return;
    const elements = document.querySelectorAll<HTMLElement>('[data-reader-page]');
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setPageNumber(Number(visible[0].target.getAttribute('data-reader-page') || 1));
    }, { threshold: [0.25, 0.5, 0.75] });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [data, mode]);
  useEffect(() => {
    if (!data || !user || !readerReady || pageNumber === sentProgress.current) return;
    const timeout = window.setTimeout(() => {
      sentProgress.current = pageNumber;
      void api.post('/reader/progress', { chapter_id: Number(chapterId), page_number: pageNumber }).catch(() => { sentProgress.current = 0; });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [data, user, readerReady, pageNumber, chapterId]);
  if (isLoading) return <Skeleton active paragraph={{ rows: 8 }} />;
  if (isError || !data) return <Alert type="error" showIcon message="Не удалось открыть главу" description="Возможно, глава не опубликована или ещё не содержит страниц." />;
  if (!data.pages.length) return <Empty description="В этой главе пока нет страниц." />;
  const go = (id: number | null) => { if (id) navigate(`/read/${id}`); };
  return <div className="reader-page page-stack">
    <div className="reader-topbar">
      <Space wrap><Link to={`/title/${data.title.slug}`}><Button icon={<ArrowLeftOutlined />}>К тайтлу</Button></Link><div><Typography.Text type="secondary">{data.title.name}</Typography.Text><Typography.Title level={4} className="reader-heading">Глава {data.chapter.number}{data.chapter.name ? ` · ${data.chapter.name}` : ''}</Typography.Title></div></Space>
      <Space wrap><SettingOutlined /><Select value={mode} onChange={setMode} options={[{ value: 'scroll', label: 'Прокрутка' }, { value: 'page', label: 'По страницам' }]} /><Select value={width} onChange={setWidth} options={[{ value: '600', label: 'Узко' }, { value: '900', label: 'Обычно' }, { value: '1200', label: 'Широко' }, { value: '100%', label: 'На всю ширину' }]} /></Space>
    </div>
    {mode === 'scroll' ? <div className="reader-images" style={{ maxWidth: width === '100%' ? '100%' : `${width}px` }}>{data.pages.map((page) => <img key={page.id} data-reader-page={page.number} src={page.url} alt={`Страница ${page.number}`} loading={page.number < 3 ? 'eager' : 'lazy'} />)}</div> : <div className="reader-single"><img src={data.pages[pageNumber - 1]?.url} alt={`Страница ${pageNumber}`} style={{ maxWidth: width === '100%' ? '100%' : `${width}px` }} /><div className="reader-nav"><Button disabled={pageNumber <= 1} onClick={() => setPageNumber((n) => n - 1)} icon={<ArrowLeftOutlined />}>Назад</Button><Typography.Text>{pageNumber} / {data.pages.length}</Typography.Text><Button disabled={pageNumber >= data.pages.length} onClick={() => setPageNumber((n) => n + 1)}>Далее <ArrowRightOutlined /></Button></div></div>}
    <div className="reader-bottom-nav"><Button disabled={!data.previous_chapter_id} onClick={() => go(data.previous_chapter_id)} icon={<ArrowLeftOutlined />}>Предыдущая глава</Button><Button disabled={!data.next_chapter_id} type="primary" onClick={() => go(data.next_chapter_id)}>Следующая глава <ArrowRightOutlined /></Button></div>
  </div>;
}
