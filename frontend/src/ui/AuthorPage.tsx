import { useRef, useState } from 'react';
import {
  Alert, Button, Checkbox, Empty, Form, Input, InputNumber, Modal, Popconfirm,
  Result, Select, Space, Spin, Table, Tag, Typography, Upload, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import {
  BookOutlined, CheckCircleOutlined, DeleteOutlined, EditOutlined, PlusOutlined,
  ReloadOutlined, UploadOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api, type MangaTitle } from '../api/client';
import { ChapterManager } from './ChapterManager';

const statusOptions = [
  { value: 'ongoing', label: 'Выходит' },
  { value: 'completed', label: 'Завершена' },
  { value: 'hiatus', label: 'Пауза' },
  { value: 'cancelled', label: 'Отменена' },
];

type Application = {
  id: number;
  pen_name: string;
  portfolio_url: string | null;
  social_links: string | null;
  motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
};
type AuthorTitle = Pick<MangaTitle,
  'id' | 'slug' | 'name' | 'description' | 'cover_url' | 'status' | 'genres' | 'updated_at' |
  'original_name' | 'alternative_names' | 'author' | 'artist' | 'release_year' | 'content_type' | 'age_rating' | 'is_colored'
> & {
  is_published: boolean;
  review_status: 'draft' | 'pending' | 'approved' | 'rejected';
  review_note: string | null;
  chapters_count: number;
};
type ChapterTitle = Pick<AuthorTitle, 'id' | 'slug' | 'name'>;

function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : error.response?.data?.message ?? 'Ошибка запроса.';
  }
  return 'Ошибка запроса.';
}

function reviewLabel(status: AuthorTitle['review_status']) {
  const map = {
    draft: { color: 'default', text: 'Черновик' },
    pending: { color: 'orange', text: 'На модерации' },
    approved: { color: 'green', text: 'Одобрен' },
    rejected: { color: 'red', text: 'Нужны исправления' },
  } as const;
  return map[status] ?? map.draft;
}

export function AuthorPage() {
  const { user, refresh } = useAuth();
  const client = useQueryClient();

  const applicationQuery = useQuery({
    queryKey: ['author-application'],
    queryFn: async () => (await api.get<{ data: Application | null }>('/auth/author-application')).data.data,
  });
  const [applicationForm] = Form.useForm();
  const applicationMutation = useMutation({
    mutationFn: async (values: { pen_name: string; portfolio_url?: string; social_links?: string; motivation: string }) =>
      api.post('/auth/author-application', values),
    onSuccess: async () => {
      message.success('Заявка отправлена. Администратор рассмотрит её.');
      applicationForm.resetFields();
      await client.invalidateQueries({ queryKey: ['author-application'] });
    },
    onError: (error) => message.error(apiError(error)),
  });

  if (user?.role === 'admin') {
    return <Result status="info" title="Ты уже администратор" subTitle="Управление авторами и публикациями находится в админке." extra={<Link to="/admin"><Button type="primary">Открыть админку</Button></Link>} />;
  }
  if (user?.role === 'author') return <AuthorWorkspace />;

  const application = applicationQuery.data;
  const canApply = !applicationQuery.isLoading && !applicationQuery.isError && (!application || application.status === 'rejected');

  return <div className="page-stack author-page">
    <section className="hero-panel">
      <div className="hero-copy">
        <Typography.Text className="eyebrow">АВТОРСКАЯ ПЛАТФОРМА</Typography.Text>
        <Typography.Title className="hero-title">Публикуй свои истории.</Typography.Title>
        <Typography.Paragraph className="hero-description">
          Подай заявку на статус автора. После одобрения ты сможешь создавать тайтлы, добавлять главы и отправлять материалы на модерацию.
        </Typography.Paragraph>
      </div>
      <div className="hero-mark" aria-hidden="true">筆</div>
    </section>

    {applicationQuery.isLoading && <Spin />}
    {applicationQuery.isError && <Alert type="error" showIcon message="Не удалось загрузить статус заявки" description={apiError(applicationQuery.error)} action={<Button icon={<ReloadOutlined />} onClick={() => void applicationQuery.refetch()}>Повторить</Button>} />}

    {application && application.status === 'pending' && <Result
      status="info"
      title="Заявка на рассмотрении"
      subTitle={`Псевдоним: ${application.pen_name}. Мы проверим заявку и выставим решение в админке.`}
      extra={<Button icon={<ReloadOutlined />} onClick={() => void applicationQuery.refetch()}>Обновить статус</Button>}
    />}

    {application && application.status === 'approved' && <Result
      status="success"
      title="Заявка одобрена"
      subTitle="Твой аккаунт получил статус автора. Обнови сессию, если кабинет автора ещё не появился."
      extra={<Button type="primary" icon={<CheckCircleOutlined />} onClick={() => void refresh()}>Обновить права</Button>}
    />}

    {application && application.status === 'rejected' && <Alert
      type="warning"
      showIcon
      message="Заявка отклонена — можно отправить новую"
      description={application.admin_note || 'Администратор не оставил комментарий. Проверь данные заявки перед повторной отправкой.'}
    />}

    {canApply && !applicationQuery.isLoading && <div className="author-form-panel">
      <Typography.Title level={3}>{application?.status === 'rejected' ? 'Повторная заявка' : 'Заявка на статус автора'}</Typography.Title>
      <Typography.Paragraph type="secondary">Расскажи, что планируешь публиковать. Заявка не даёт доступ автоматически: сначала её должен одобрить администратор.</Typography.Paragraph>
      <Form form={applicationForm} layout="vertical" onFinish={(values) => applicationMutation.mutate(values)}>
        <Form.Item name="pen_name" label="Авторский псевдоним" rules={[{ required: true, min: 2, max: 120, message: 'Укажи псевдоним от 2 до 120 символов.' }]}>
          <Input placeholder="Как будет отображаться имя автора" maxLength={120} />
        </Form.Item>
        <Form.Item name="portfolio_url" label="Портфолио или пример работ" rules={[{ type: 'url', message: 'Укажи полный URL, например https://example.com' }, { max: 2048 }]}>
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item name="social_links" label="Социальные сети и дополнительные ссылки">
          <Input.TextArea rows={2} maxLength={4000} showCount placeholder="Ссылки на профиль, команду, переводческие проекты…" />
        </Form.Item>
        <Form.Item name="motivation" label="Что планируешь публиковать?" rules={[{ required: true, min: 30, max: 5000, message: 'Опиши планы минимум в 30 символах.' }]}>
          <Input.TextArea rows={5} maxLength={5000} showCount placeholder="Расскажи о своих проектах, правах на материалы и планируемой активности." />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={applicationMutation.isPending}>Отправить на рассмотрение</Button>
      </Form>
    </div>}
  </div>;
}

function AuthorWorkspace() {
  const client = useQueryClient();
  const [titleModal, setTitleModal] = useState(false);
  const [editing, setEditing] = useState<AuthorTitle | null>(null);
  const [chapterManager, setChapterManager] = useState<ChapterTitle | null>(null);
  const [chapterTitle, setChapterTitle] = useState<ChapterTitle | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [pages, setPages] = useState<(File & { uid: string })[]>([]);
  const pageFileIds = useRef(new Set<string>());
  const [errorText, setErrorText] = useState('');
  const [form] = Form.useForm();
  const [chapterForm] = Form.useForm();

  const query = useQuery({
    queryKey: ['author-titles'],
    queryFn: async () => (await api.get<{ data: AuthorTitle[] }>('/author/titles')).data.data,
  });

  const coverProps: UploadProps = {
    beforeUpload: (file) => { setCover(file); return false; },
    maxCount: 1,
    accept: 'image/jpeg,image/png,image/webp,image/avif',
    onRemove: () => { setCover(null); return true; },
  };
  const pageProps: UploadProps = {
    multiple: true,
    beforeUpload: (file) => {
      if (!pageFileIds.current.has(file.uid) && pageFileIds.current.size >= 30) {
        message.error('За одну загрузку можно выбрать не более 30 страниц. Загружай их несколькими партиями.');
        return Upload.LIST_IGNORE;
      }
      pageFileIds.current.add(file.uid);
      setPages((old) => old.some((item) => item.uid === file.uid) ? old : [...old, file]);
      return false;
    },
    onRemove: (file) => { pageFileIds.current.delete(file.uid); setPages((old) => old.filter((item) => item.uid !== file.uid)); return true; },
    accept: 'image/jpeg,image/png,image/webp,image/avif',
  };

  const saveTitle = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const body = new FormData();
      Object.entries(values).forEach(([key, value]) => {
        if ((key === 'genres' || key === 'alternative_names') && Array.isArray(value)) {
          value.forEach((item) => body.append(`${key}[]`, String(item)));
          if (key === 'alternative_names' && value.length === 0) body.append('clear_alternative_names', '1');
        } else if (key === 'is_colored') body.append(key, value ? '1' : '0');
        else if (value !== undefined) body.append(key, value === null ? '' : String(value));
      });
      if (cover) body.append('cover', cover);
      if (editing) await api.post(`/author/titles/${editing.id}`, body);
      else await api.post('/author/titles', body);
    },
    onSuccess: async () => {
      message.success(editing ? 'Изменения отправлены на повторную модерацию.' : 'Тайтл создан и отправлен на модерацию.');
      setTitleModal(false); setEditing(null); setCover(null); setErrorText(''); form.resetFields();
      await Promise.all([
        client.invalidateQueries({ queryKey: ['author-titles'] }),
        client.invalidateQueries({ queryKey: ['titles'] }),
        client.invalidateQueries({ queryKey: ['genres'] }),
      ]);
    },
    onError: (error) => setErrorText(apiError(error)),
  });

  const removeTitle = useMutation({
    mutationFn: (id: number) => api.delete(`/author/titles/${id}`),
    onSuccess: async () => { message.success('Черновик удалён.'); await client.invalidateQueries({ queryKey: ['author-titles'] }); },
    onError: (error) => message.error(apiError(error)),
  });

  const saveChapter = useMutation({
    mutationFn: async (values: { number: number; name?: string }) => {
      if (!chapterTitle) return;
      const body = new FormData();
      body.append('number', String(values.number));
      if (values.name) body.append('name', values.name);
      pages.forEach((file) => body.append('pages[]', file));
      await api.post(`/author/titles/${chapterTitle.id}/chapters`, body);
    },
    onSuccess: async () => {
      message.success('Глава создана и ожидает проверки администратора.');
      setChapterTitle(null); setPages([]); pageFileIds.current.clear(); chapterForm.resetFields();
      await Promise.all([client.invalidateQueries({ queryKey: ['author-titles'] }), client.invalidateQueries({ queryKey: ['author-chapters'] }), client.invalidateQueries({ queryKey: ['titles'] })]);
    },
    onError: (error) => setErrorText(apiError(error)),
  });

  const columns: ColumnsType<AuthorTitle> = [
    {
      title: 'Тайтл', key: 'title', render: (_: unknown, item) => <div className="admin-title-cell">
        {item.cover_url ? <img src={item.cover_url} alt="" /> : <div className="admin-cover-empty"><BookOutlined /></div>}
        <div><strong>{item.name}</strong><div className="muted">/{item.slug}</div></div>
      </div>,
    },
    { title: 'Модерация', dataIndex: 'review_status', key: 'review_status', render: (value: AuthorTitle['review_status']) => { const label = reviewLabel(value); return <Tag color={label.color}>{label.text}</Tag>; } },
    { title: 'Главы', dataIndex: 'chapters_count', key: 'chapters_count' },
    {
      title: 'Комментарий модератора', dataIndex: 'review_note', key: 'review_note', render: (value: string | null) => value || '—',
    },
    {
      title: 'Действия', key: 'actions', render: (_: unknown, item) => <Space wrap>
        <Button icon={<EditOutlined />} onClick={() => {
          setEditing(item); setCover(null); setErrorText('');
          form.setFieldsValue({
            name: item.name, slug: item.slug, description: item.description,
            original_name: item.original_name, alternative_names: item.alternative_names ?? [],
            author: item.author, artist: item.artist, release_year: item.release_year,
            content_type: item.content_type, age_rating: item.age_rating, is_colored: item.is_colored,
            status: item.status, genres: item.genres,
          });
          setTitleModal(true);
        }}>Редактировать</Button>
        <Button onClick={() => setChapterManager(item)}>Главы</Button>
        {!item.is_published && <Popconfirm title="Удалить этот тайтл?" description="Удалить можно только неопубликованные тайтлы." okText="Удалить" cancelText="Отмена" onConfirm={() => removeTitle.mutate(item.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm>}
      </Space>,
    },
  ];

  return <div className="page-stack author-page">
    <div className="section-heading">
      <div><Typography.Text className="eyebrow">АВТОРСКИЙ КАБИНЕТ</Typography.Text><Typography.Title>Мои тайтлы</Typography.Title><Typography.Text type="secondary">Новые тайтлы и изменения проверяет администратор перед публикацией. Главы также публикуются только после проверки.</Typography.Text></div>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => {
        setEditing(null); setCover(null); setErrorText(''); form.resetFields();
        form.setFieldsValue({ status: 'ongoing', content_type: 'manga', age_rating: '16+', is_colored: false, alternative_names: [], genres: [] });
        setTitleModal(true);
      }}>Добавить тайтл</Button>
    </div>

    {query.isError && <Alert type="error" showIcon message="Не удалось загрузить тайтлы" description={apiError(query.error)} action={<Button onClick={() => void query.refetch()}>Повторить</Button>} />}
    <Table rowKey="id" loading={query.isLoading} columns={columns} dataSource={query.data ?? []} scroll={{ x: 1050 }} pagination={{ pageSize: 10 }} locale={{ emptyText: <Empty description="Пока нет тайтлов. Создай первый и отправь его на модерацию." /> }} />

    <ChapterManager title={chapterManager} basePath="author" onClose={() => setChapterManager(null)} onAddChapter={(title) => {
      setChapterManager(null); setErrorText(''); setPages([]); pageFileIds.current.clear(); setChapterTitle(title as ChapterTitle);
    }} />

    <Modal title={editing ? 'Редактировать тайтл' : 'Новый тайтл'} open={titleModal} onCancel={() => setTitleModal(false)} onOk={() => form.submit()} confirmLoading={saveTitle.isPending} okText="Отправить на модерацию" cancelText="Отмена" destroyOnHidden width={760}>
      {errorText && <Alert type="error" message={errorText} showIcon className="modal-alert" />}
      {editing?.is_published && <Alert type="warning" showIcon className="modal-alert" message="Редактирование снимет текущую версию с публикации до повторного одобрения администратором." />}
      <Form form={form} layout="vertical" onFinish={(values) => saveTitle.mutate(values)}>
        <Form.Item name="name" label="Название" rules={[{ required: true, max: 190 }]}><Input /></Form.Item>
        <Form.Item name="slug" label="URL (оставь пустым для автогенерации)"><Input placeholder="my-manga" /></Form.Item>
        <Form.Item name="original_name" label="Оригинальное название"><Input /></Form.Item>
        <Form.Item name="alternative_names" label="Альтернативные названия"><Select mode="tags" tokenSeparators={[',']} placeholder="Добавь вариант и нажми Enter" /></Form.Item>
        <Space className="admin-metadata-row" wrap>
          <Form.Item name="author" label="Автор произведения"><Input /></Form.Item>
          <Form.Item name="artist" label="Художник"><Input /></Form.Item>
          <Form.Item name="release_year" label="Год"><InputNumber min={1900} max={new Date().getFullYear() + 10} /></Form.Item>
        </Space>
        <Space className="admin-metadata-row" wrap>
          <Form.Item name="content_type" label="Тип" rules={[{ required: true }]}><Select options={[{ value: 'manga', label: 'Манга' }, { value: 'manhwa', label: 'Манхва' }, { value: 'manhua', label: 'Маньхуа' }, { value: 'comic', label: 'Комикс' }, { value: 'webtoon', label: 'Вебтун' }, { value: 'novel', label: 'Новелла' }]} /></Form.Item>
          <Form.Item name="age_rating" label="Возрастной рейтинг" rules={[{ required: true }]}><Select options={[{ value: 'all', label: 'Для всех' }, { value: '12+', label: '12+' }, { value: '16+', label: '16+' }, { value: '18+', label: '18+' }]} /></Form.Item>
        </Space>
        <Form.Item name="is_colored" valuePropName="checked"><Checkbox>Цветная</Checkbox></Form.Item>
        <Form.Item name="description" label="Описание"><Input.TextArea rows={4} maxLength={30000} showCount /></Form.Item>
        <Form.Item name="status" label="Статус" rules={[{ required: true }]}><Select options={statusOptions} /></Form.Item>
        <Form.Item name="genres" label="Жанры"><Select mode="tags" tokenSeparators={[',']} placeholder="Введи жанр и нажми Enter" /></Form.Item>
        <Form.Item label="Обложка"><Upload {...coverProps} listType="picture" maxCount={1}><Button icon={<UploadOutlined />}>Выбрать изображение</Button></Upload><Typography.Text type="secondary">JPG, PNG, WebP или AVIF, до 15 МБ. Для публикации нужна обложка.</Typography.Text></Form.Item>
      </Form>
    </Modal>

    <Modal title={`Новая глава · ${chapterTitle?.name ?? ''}`} open={!!chapterTitle} onCancel={() => setChapterTitle(null)} onOk={() => chapterForm.submit()} confirmLoading={saveChapter.isPending} okText="Создать главу на проверку" cancelText="Отмена" destroyOnHidden>
      {errorText && <Alert type="error" message={errorText} showIcon className="modal-alert" />}
      <Form form={chapterForm} layout="vertical" onFinish={(values) => saveChapter.mutate(values)}>
        <Form.Item name="number" label="Номер главы" rules={[{ required: true }]}><InputNumber min={0} max={9999999.999} step={0.001} style={{ width: '100%' }} /></Form.Item>
        <Form.Item name="name" label="Название главы"><Input /></Form.Item>
        <Form.Item label="Страницы (выбирай в нужном порядке)"><Upload {...pageProps} listType="text"><Button icon={<UploadOutlined />}>Добавить страницы</Button></Upload><Typography.Text type="secondary">До 30 изображений за загрузку, до 15 МБ каждое. Можно добавлять страницы позже из раздела «Главы».</Typography.Text></Form.Item>
      </Form>
    </Modal>
  </div>;
}
