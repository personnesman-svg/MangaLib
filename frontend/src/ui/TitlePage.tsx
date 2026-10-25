import { useState } from 'react';
import { Alert, Button, Descriptions, Empty, Form, Input, Skeleton, Tag, Typography, message, Space } from 'antd';
import { ArrowLeftOutlined, HeartOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { api, getTitle } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { csrf } from '../api/client';
import axios from 'axios';

type CommentItem = { id: number; content: string; created_at: string; user: { id: number; name: string }; replies?: CommentItem[] };
export function TitlePage() {
  const { slug = '' } = useParams();
  const { user } = useAuth();
  const client = useQueryClient();
  const [commentError, setCommentError] = useState('');
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [form] = Form.useForm();
  const { data, isLoading, isError } = useQuery({ queryKey: ['title', slug], queryFn: () => getTitle(slug) });
  const library = useQuery({
    queryKey: ['library'], enabled: !!user,
    queryFn: async () => (await api.get<{ bookmarks: { id: number }[]; history: unknown[] }>('/library')).data,
  });
  const isBookmarked = !!data && !!library.data?.bookmarks.some((item) => item.id === data.id);
  const comments = useQuery({ queryKey: ['comments', data?.id], enabled: !!data?.id, queryFn: async () => (await api.get<{ data: { data: CommentItem[] } }>(`/titles/${data!.id}/comments`)).data.data.data });
  const bookmark = useMutation({ mutationFn: async () => { await csrf(); return isBookmarked ? api.delete(`/library/bookmarks/${data?.id}`) : api.post(`/library/bookmarks/${data?.id}`); }, onSuccess: async () => { message.success(isBookmarked ? 'Удалено из библиотеки.' : 'Добавлено в библиотеку.'); await client.invalidateQueries({ queryKey: ['library'] }); }, onError: (e) => message.error(axios.isAxiosError(e) ? e.response?.data?.message ?? 'Не удалось добавить закладку.' : 'Не удалось добавить закладку.') });
  const postComment = useMutation({ mutationFn: async (values: { content: string; parent_id?: number }) => { await csrf(); return api.post(`/titles/${data?.id}/comments`, values); }, onSuccess: async () => { form.resetFields(); setReplyTo(null); setCommentError(''); await client.invalidateQueries({ queryKey: ['comments', data?.id] }); message.success('Комментарий добавлен.'); }, onError: (e) => setCommentError(axios.isAxiosError(e) ? Object.values((e.response?.data?.errors ?? {}) as Record<string, string[]>).flat().join(' ') || e.response?.data?.message || 'Не удалось отправить комментарий.' : 'Не удалось отправить комментарий.') });
  if (isLoading) return <Skeleton active />;
  if (isError || !data) return <Alert type="error" message="Не удалось загрузить тайтл" showIcon />;
  return <div className="page-stack">
    <Link to="/"><Button icon={<ArrowLeftOutlined />}>К каталогу</Button></Link>
    <div className="title-layout">
      <div className="detail-cover">{data.cover_url ? <img src={data.cover_url} alt={data.name} /> : <Empty description="Обложка не загружена" />}</div>
      <div><Typography.Title>{data.name}</Typography.Title><Typography.Paragraph>{data.description || 'Описание пока не добавлено.'}</Typography.Paragraph>
        <Space wrap>{data.genres.map((genre) => <Tag key={genre}>{genre}</Tag>)}</Space>
        <Descriptions className="title-descriptions" column={1} items={[
          { key: 'type', label: 'Тип', children: ({ manga: 'Манга', manhwa: 'Манхва', manhua: 'Маньхуа', comic: 'Комикс', webtoon: 'Вебтун', novel: 'Новелла' } as Record<string, string>)[data.content_type] ?? data.content_type },
          { key: 'status', label: 'Статус', children: ({ ongoing: 'Выходит', completed: 'Завершена', hiatus: 'Пауза', cancelled: 'Отменена' } as Record<string, string>)[data.status] ?? data.status },
          { key: 'original', label: 'Оригинальное название', children: data.original_name || '—' },
          { key: 'author', label: 'Автор', children: data.author || '—' },
          { key: 'artist', label: 'Художник', children: data.artist || '—' },
          { key: 'year', label: 'Год', children: data.release_year || '—' },
          { key: 'rating', label: 'Возрастной рейтинг', children: data.age_rating || '—' },
          { key: 'color', label: 'Формат', children: data.is_colored ? 'Цветная' : 'Чёрно-белая' },
          { key: 'chapters', label: 'Глав', children: data.chapters.length },
          { key: 'views', label: 'Просмотры', children: <Space><EyeOutlined />{data.view_count ?? 0}</Space> },
        ]} />
        {user && <Button icon={<HeartOutlined />} onClick={() => bookmark.mutate()} loading={bookmark.isPending}>{isBookmarked ? 'Убрать из библиотеки' : 'В библиотеку'}</Button>}
      </div>
    </div>
    <section><Typography.Title level={2}>Главы</Typography.Title>
      {data.chapters.length === 0 ? <Empty description="Главы ещё не добавлены." /> : data.chapters.map((chapter) => <div className="chapter-row" key={chapter.id}><span>Глава {chapter.number}{chapter.name ? ` — ${chapter.name}` : ''}<div className="muted">{chapter.pages_count ?? 0} страниц</div></span><Link to={`/read/${chapter.id}`}>Читать</Link></div>)}
    </section>
    <section className="comments-section"><Typography.Title level={2}>Комментарии</Typography.Title>
      {user ? <Form form={form} layout="vertical" onFinish={(values) => postComment.mutate({ ...values, ...(replyTo ? { parent_id: replyTo.id } : {}) })}>
        {replyTo && <Alert type="info" message={`Ответ для ${replyTo.user.name}`} action={<Button size="small" type="link" onClick={() => setReplyTo(null)}>Отменить</Button>} className="modal-alert" />}
        <Form.Item name="content" rules={[{ required: true, whitespace: true, max: 3000, message: 'Напиши комментарий до 3000 символов.' }]}><Input.TextArea rows={3} maxLength={3000} showCount placeholder="Поделись впечатлениями о тайтле…" /></Form.Item>
        {commentError && <Alert type="error" message={commentError} className="modal-alert" />}
        <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={postComment.isPending}>{replyTo ? 'Ответить' : 'Отправить'}</Button>
      </Form> : <Alert type="info" message="Войди в аккаунт, чтобы оставлять комментарии." />}
      {comments.isLoading ? <Skeleton active /> : comments.data?.length ? comments.data.map((comment) => <div className="comment-item" key={comment.id}>
        <strong>{comment.user.name}</strong><Typography.Paragraph>{comment.content}</Typography.Paragraph>
        <Space><Typography.Text type="secondary">{new Date(comment.created_at).toLocaleString()}</Typography.Text>{user && <Button size="small" type="link" onClick={() => setReplyTo(comment)}>Ответить</Button>}</Space>
        {comment.replies?.map((reply) => <div className="comment-reply" key={reply.id}><strong>{reply.user.name}</strong><Typography.Paragraph>{reply.content}</Typography.Paragraph><Typography.Text type="secondary">{new Date(reply.created_at).toLocaleString()}</Typography.Text></div>)}
      </div>) : <Empty description="Комментариев пока нет." />}
    </section>
  </div>;
}
