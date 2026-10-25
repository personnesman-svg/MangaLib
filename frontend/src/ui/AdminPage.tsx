import { useMemo, useRef, useState } from 'react';
import { Alert, Button, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, Tag, Typography, Upload, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { UploadProps } from 'antd';
import { PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined, BookOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { ChapterManager } from './ChapterManager';
import { AuthorApplicationsPanel } from './AuthorApplicationsPanel';
import { api, type MangaTitle } from '../api/client';

const statusOptions = [
  { value: 'ongoing', label: 'Выходит' }, { value: 'completed', label: 'Завершена' },
  { value: 'hiatus', label: 'Пауза' }, { value: 'cancelled', label: 'Отменена' },
];
type AdminTitle = Pick<MangaTitle, 'id' | 'slug' | 'name' | 'description' | 'cover_url' | 'status' | 'genres' | 'updated_at' | 'original_name' | 'alternative_names' | 'author' | 'artist' | 'release_year' | 'content_type' | 'age_rating' | 'is_colored'> & { chapters_count: number; is_published: boolean; owner_user_id: number | null; owner_name: string | null; owner_email: string | null; review_status: 'draft' | 'pending' | 'approved' | 'rejected'; review_note: string | null; reviewed_at: string | null }; 
function apiError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : error.response?.data?.message ?? 'Ошибка запроса.';
  }
  return 'Ошибка запроса.';
}
export function AdminPage() {
  const client = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['admin-titles'], queryFn: async () => (await api.get<{ data: AdminTitle[]; meta: unknown }>('/admin/titles')).data });
  const [titleModal, setTitleModal] = useState(false);
  const [chapterModal, setChapterModal] = useState<AdminTitle | null>(null);
  const [chapterManager, setChapterManager] = useState<AdminTitle | null>(null);
  const [editing, setEditing] = useState<AdminTitle | null>(null);
  const [reviewing, setReviewing] = useState<AdminTitle | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [pages, setPages] = useState<(File & { uid: string })[]>([]);
  const pageFileIds = useRef(new Set<string>());
  const [form] = Form.useForm();
  const [chapterForm] = Form.useForm();
  const [errorText, setErrorText] = useState('');
  const uploadProps: UploadProps = { beforeUpload: (file) => { setCover(file); return false; }, maxCount: 1, accept: 'image/jpeg,image/png,image/webp,image/avif', onRemove: () => { setCover(null); return true; } };
  const pageUploadProps: UploadProps = { multiple: true, beforeUpload: (file) => { if (!pageFileIds.current.has(file.uid) && pageFileIds.current.size >= 30) { message.error('За одну загрузку можно выбрать не более 30 страниц. Загрузи их несколькими партиями.'); return Upload.LIST_IGNORE; } pageFileIds.current.add(file.uid); setPages((old) => old.some((item) => item.uid === file.uid) ? old : [...old, file]); return false; }, accept: 'image/jpeg,image/png,image/webp,image/avif', onRemove: (file) => { pageFileIds.current.delete(file.uid); setPages((old) => old.filter((item) => item.uid !== file.uid)); return true; } };

  const saveTitle = useMutation({ mutationFn: async (values: Record<string, unknown>) => {
    const body = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if ((key === 'genres' || key === 'alternative_names') && Array.isArray(value)) {
        value.forEach((item) => body.append(`${key}[]`, String(item)));
        if (key === 'alternative_names' && value.length === 0) body.append('clear_alternative_names', '1');
      } else if (key === 'is_published' || key === 'is_colored') body.append(key, value ? '1' : '0');
      else if (value !== undefined) body.append(key, value === null ? '' : String(value));
    });
    if (cover) body.append('cover', cover);
    if (editing) await api.post(`/admin/titles/${editing.id}`, body);
    else await api.post('/admin/titles', body);
  }, onSuccess: async () => { message.success(editing ? 'Тайтл обновлён.' : 'Тайтл создан.'); setTitleModal(false); setEditing(null); setCover(null); form.resetFields(); await Promise.all([client.invalidateQueries({ queryKey: ['admin-titles'] }), client.invalidateQueries({ queryKey: ['titles'] }), client.invalidateQueries({ queryKey: ['genres'] }), client.invalidateQueries({ queryKey: ['library'] }), ...(editing ? [client.invalidateQueries({ queryKey: ['title', editing.slug] })] : [])]); }, onError: (e) => setErrorText(apiError(e)) });
  const removeTitle = useMutation({ mutationFn: (id: number) => api.delete(`/admin/titles/${id}`), onSuccess: async () => { message.success('Тайтл удалён.'); await Promise.all([client.invalidateQueries({ queryKey: ['admin-titles'] }), client.invalidateQueries({ queryKey: ['titles'] }), client.invalidateQueries({ queryKey: ['genres'] }), client.invalidateQueries({ queryKey: ['library'] })]); }, onError: (e) => message.error(apiError(e)) });
  const reviewTitle = useMutation({
    mutationFn: async (input: { title: AdminTitle; status: 'approved' | 'rejected'; review_note?: string }) => api.post(`/admin/titles/${input.title.id}/review`, { status: input.status, review_note: input.review_note }),
    onSuccess: async (_response, input) => {
      message.success(input.status === 'approved' ? 'Тайтл одобрен и опубликован.' : 'Тайтл отправлен автору на исправление.');
      setReviewing(null); setReviewNote('');
      await Promise.all([client.invalidateQueries({ queryKey: ['admin-titles'] }), client.invalidateQueries({ queryKey: ['titles'] }), client.invalidateQueries({ queryKey: ['genres'] })]);
    },
    onError: (e) => message.error(apiError(e)),
  });
  const saveChapter = useMutation({ mutationFn: async (values: { number: number; name?: string; is_published?: boolean }) => {
    if (!chapterModal) return;
    const body = new FormData(); body.append('number', String(values.number)); if (values.name) body.append('name', values.name); body.append('is_published', values.is_published && pages.length > 0 ? '1' : '0');
    pages.forEach((file) => body.append('pages[]', file));
    await api.post(`/admin/titles/${chapterModal.id}/chapters`, body);
  }, onSuccess: async () => { message.success('Глава добавлена.'); const titleId = chapterModal?.id; const titleSlug = chapterModal?.slug; setChapterModal(null); setPages([]); pageFileIds.current.clear(); chapterForm.resetFields(); await Promise.all([client.invalidateQueries({ queryKey: ['admin-titles'] }), client.invalidateQueries({ queryKey: ['titles'] }), ...(titleId ? [client.invalidateQueries({ queryKey: ['admin-chapters', titleId] })] : []), ...(titleSlug ? [client.invalidateQueries({ queryKey: ['title', titleSlug] })] : [])]); }, onError: (e) => setErrorText(apiError(e)) });

  const columns: ColumnsType<AdminTitle> = useMemo(() => [
    { title: 'Тайтл', dataIndex: 'name', key: 'name', render: (_: string, item: AdminTitle) => <div className="admin-title-cell">{item.cover_url ? <img src={item.cover_url} alt="" /> : <div className="admin-cover-empty"><BookOutlined /></div>}<div><strong>{item.name}</strong><div className="muted">/{item.slug}</div></div></div> },
    { title: 'Статус', dataIndex: 'status', key: 'status', render: (value: string) => statusOptions.find((x) => x.value === value)?.label ?? value },
    { title: 'Публикация', dataIndex: 'is_published', key: 'is_published', render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? 'Опубликован' : 'Не опубликован'}</Tag> },
    { title: 'Модерация', dataIndex: 'review_status', key: 'review_status', render: (value: AdminTitle['review_status']) => { const labels = { draft: ['default', 'Черновик'], pending: ['orange', 'На проверке'], approved: ['green', 'Одобрен'], rejected: ['red', 'Отклонён'] } as const; const label = labels[value] ?? labels.draft; return <Tag color={label[0]}>{label[1]}</Tag>; } },
    { title: 'Автор-заявитель', key: 'owner', render: (_: unknown, item: AdminTitle) => item.owner_name ? <div><strong>{item.owner_name}</strong><div className="muted">{item.owner_email}</div></div> : 'Администрация' },
    { title: 'Главы', dataIndex: 'chapters_count', key: 'chapters_count' },
    { title: 'Действия', key: 'actions', render: (_: unknown, item: AdminTitle) => <Space wrap>
      {item.review_status === 'pending' && item.owner_user_id !== null && <><Button type="primary" icon={<CheckOutlined />} onClick={() => reviewTitle.mutate({ title: item, status: 'approved' })} loading={reviewTitle.isPending}>Одобрить</Button><Button danger icon={<CloseOutlined />} onClick={() => { setReviewing(item); setReviewNote(''); }}>Отклонить</Button></>}
      <Button icon={<EditOutlined />} onClick={() => { setEditing(item); setCover(null); form.setFieldsValue({ name: item.name, slug: item.slug, description: item.description, original_name: item.original_name, alternative_names: item.alternative_names ?? [], author: item.author, artist: item.artist, release_year: item.release_year, content_type: item.content_type, age_rating: item.age_rating, is_colored: item.is_colored, status: item.status, is_published: item.is_published, genres: item.genres }); setTitleModal(true); }}>Изменить</Button>
      <Button onClick={() => setChapterManager(item)}>Главы</Button><Button icon={<PlusOutlined />} onClick={() => { setErrorText(''); setPages([]); pageFileIds.current.clear(); setChapterModal(item); }}>Добавить главу</Button>
      <Popconfirm title="Удалить тайтл и все его главы?" description="Это действие необратимо." okText="Удалить" cancelText="Отмена" onConfirm={() => removeTitle.mutate(item.id)}><Button danger icon={<DeleteOutlined />} /></Popconfirm>
    </Space> },
  ], [form, removeTitle, reviewTitle]);

  return <div className="page-stack">
    <AuthorApplicationsPanel />
    <div className="section-heading"><div><Typography.Title>Управление каталогом</Typography.Title><Typography.Text type="secondary">Создавай тайтлы и загружай главы. Никаких автоматических демо-записей.</Typography.Text></div><Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setCover(null); form.resetFields(); form.setFieldsValue({ status: 'ongoing', content_type: 'manga', age_rating: '16+', is_colored: false, is_published: false, alternative_names: [], genres: [] }); setErrorText(''); setTitleModal(true); }}>Добавить тайтл</Button></div>
    {isError && <Alert type="error" showIcon message="Не удалось загрузить админку" description={apiError(error)} />}
    <Table rowKey="id" loading={isLoading} columns={columns} dataSource={data?.data ?? []} scroll={{ x: 850 }} pagination={{ pageSize: 20 }} locale={{ emptyText: 'Тайтлов пока нет. Добавь первый.' }} />

    <ChapterManager title={chapterManager} authorSubmitted={chapterManager?.owner_user_id !== null && chapterManager?.owner_user_id !== undefined} onClose={() => setChapterManager(null)} onAddChapter={(title) => { setChapterManager(null); setErrorText(''); setPages([]); pageFileIds.current.clear(); setChapterModal(title as AdminTitle); }} />

    <Modal title={editing ? 'Редактировать тайтл' : 'Новый тайтл'} open={titleModal} onCancel={() => setTitleModal(false)} onOk={() => form.submit()} confirmLoading={saveTitle.isPending} okText={editing ? 'Сохранить' : 'Создать'} cancelText="Отмена" destroyOnHidden width={720}>
      {errorText && <Alert type="error" message={errorText} showIcon className="modal-alert" />}
      <Form form={form} layout="vertical" onFinish={(values) => saveTitle.mutate(values)} initialValues={{ status: 'ongoing', is_published: false }}>
        <Form.Item name="name" label="Название" rules={[{ required: true, max: 190 }]}><Input /></Form.Item>
        <Form.Item name="slug" label="URL (можно оставить пустым для автогенерации)" ><Input placeholder="my-manga" /></Form.Item>
        <Form.Item name="original_name" label="Оригинальное название"><Input /></Form.Item>
        <Form.Item name="alternative_names" label="Альтернативные названия"><Select mode="tags" tokenSeparators={[',']} placeholder="Добавь вариант и нажми Enter" /></Form.Item>
        <Space className="admin-metadata-row" wrap>
          <Form.Item name="author" label="Автор"><Input /></Form.Item>
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
        <Form.Item label="Обложка"><Upload {...uploadProps} listType="picture" maxCount={1}><Button icon={<UploadOutlined />}>Выбрать изображение</Button></Upload><Typography.Text type="secondary">JPG, PNG, WebP или AVIF, до 15 МБ.</Typography.Text></Form.Item>
        <Form.Item name="is_published" valuePropName="checked"><Checkbox>Опубликовать тайтл</Checkbox></Form.Item>
      </Form>
    </Modal>

    <Modal title={`Новая глава · ${chapterModal?.name ?? ''}`} open={!!chapterModal} onCancel={() => setChapterModal(null)} onOk={() => chapterForm.submit()} confirmLoading={saveChapter.isPending} okText="Добавить главу" cancelText="Отмена" destroyOnHidden>
      {errorText && <Alert type="error" message={errorText} showIcon className="modal-alert" />}
      <Form form={chapterForm} layout="vertical" onFinish={(values) => saveChapter.mutate(values)}>
        <Form.Item name="number" label="Номер главы" rules={[{ required: true }]}><Input type="number" min={0} step="0.001" /></Form.Item>
        <Form.Item name="name" label="Название главы"><Input /></Form.Item>
        <Form.Item label="Страницы (выбери в нужном порядке)"><Upload {...pageUploadProps} listType="text"><Button icon={<UploadOutlined />}>Добавить страницы</Button></Upload><Typography.Text type="secondary">До 30 изображений за загрузку; большие главы загружай несколькими партиями. Если опубликовать без страниц, глава останется черновиком.</Typography.Text></Form.Item>
        <Form.Item name="is_published" valuePropName="checked"><Checkbox>Опубликовать после загрузки страниц</Checkbox></Form.Item>
      </Form>
    </Modal>

    <Modal title={`Отклонить тайтл · ${reviewing?.name ?? ''}`} open={!!reviewing} onCancel={() => { setReviewing(null); setReviewNote(''); }} onOk={() => reviewing && reviewTitle.mutate({ title: reviewing, status: 'rejected', review_note: reviewNote })} confirmLoading={reviewTitle.isPending} okText="Отклонить" cancelText="Отмена" okButtonProps={{ danger: true }} destroyOnHidden>
      <Typography.Paragraph type="secondary">Комментарий будет показан автору в его кабинете.</Typography.Paragraph>
      <Input.TextArea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} rows={4} maxLength={5000} showCount placeholder="Что необходимо исправить…" />
    </Modal>
  </div>;
}
