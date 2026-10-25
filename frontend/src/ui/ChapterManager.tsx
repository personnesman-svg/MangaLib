import { useRef, useState } from 'react';
import { Alert, Button, Empty, Modal, Popconfirm, Space, Spin, Tag, Typography, Upload, message } from 'antd';
import type { UploadProps } from 'antd';
import { DeleteOutlined, UploadOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type MangaTitle } from '../api/client';

export type AdminChapter = {
  id: number; number: string; name: string | null; is_published: boolean;
  published_at: string | null; pages_count: number;
};

type ChapterManagerTitle = Pick<MangaTitle, 'id' | 'slug' | 'name'>;

export function ChapterManager({ title, onClose, onAddChapter, basePath = 'admin', authorSubmitted = false }: {
  title: ChapterManagerTitle | null; onClose: () => void; onAddChapter: (title: ChapterManagerTitle) => void; basePath?: 'admin' | 'author'; authorSubmitted?: boolean;
}) {
  const client = useQueryClient();
  const [uploadTarget, setUploadTarget] = useState<AdminChapter | null>(null);
  const [pages, setPages] = useState<(File & { uid: string })[]>([]);
  const pageFileIds = useRef(new Set<string>());
  const [errorText, setErrorText] = useState('');
  const routeBase = `/${basePath}`;
  const query = useQuery({
    queryKey: [basePath + '-chapters', title?.id], enabled: !!title,
    queryFn: async () => (await api.get<{ data: AdminChapter[] }>(`${routeBase}/titles/${title!.id}/chapters`)).data.data,
  });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: [basePath + '-chapters', title?.id] });
    await client.invalidateQueries({ queryKey: [basePath + '-titles'] });
    await client.invalidateQueries({ queryKey: ['admin-titles'] });
    await client.invalidateQueries({ queryKey: ['titles'] });
    if (title?.slug) await client.invalidateQueries({ queryKey: ['title', title.slug] });
  };
  const toggle = useMutation({
    mutationFn: async (chapter: AdminChapter) => api.put(`/admin/chapters/${chapter.id}`, { is_published: !chapter.is_published }),
    onSuccess: async () => { message.success('Публикация главы обновлена.'); await refresh(); },
    onError: (error: any) => message.error(error?.response?.data?.message ?? 'Не удалось обновить главу.'),
  });
  const remove = useMutation({
    mutationFn: (chapterId: number) => api.delete(`${routeBase}/chapters/${chapterId}`),
    onSuccess: async () => { message.success('Глава удалена.'); await refresh(); },
    onError: (error: any) => message.error(error?.response?.data?.message ?? 'Не удалось удалить главу.'),
  });
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!uploadTarget) return;
      const body = new FormData(); pages.forEach((file) => body.append('pages[]', file));
      await api.post(`${routeBase}/chapters/${uploadTarget.id}/pages`, body);
    },
    onSuccess: async () => { message.success('Страницы загружены.'); setUploadTarget(null); setPages([]); pageFileIds.current.clear(); setErrorText(''); await refresh(); },
    onError: (error: any) => setErrorText(error?.response?.data?.message ?? 'Не удалось загрузить изображения.'),
  });
  const uploadProps: UploadProps = {
    multiple: true,
    beforeUpload: (file) => { if (!pageFileIds.current.has(file.uid) && pageFileIds.current.size >= 30) { message.error('За одну загрузку можно выбрать не более 30 страниц. Загрузи их несколькими партиями.'); return Upload.LIST_IGNORE; } pageFileIds.current.add(file.uid); setPages((old) => old.some((item) => item.uid === file.uid) ? old : [...old, file]); return false; },
    onRemove: (file) => { pageFileIds.current.delete(file.uid); setPages((old) => old.filter((item) => item.uid !== file.uid)); return true; },
    accept: 'image/jpeg,image/png,image/webp,image/avif',
  };

  return <>
    <Modal title={`Главы · ${title?.name ?? ''}`} open={!!title} onCancel={onClose} footer={null} width={850} destroyOnHidden>
      <div className="chapter-manager-actions"><Typography.Text type="secondary">Черновики не отображаются в публичном каталоге.</Typography.Text>{title && <Button type="primary" onClick={() => onAddChapter(title)}>Добавить главу</Button>}</div>
      {query.isLoading ? <Spin /> : query.isError ? <Alert type="error" showIcon message="Не удалось получить список глав." /> : query.data?.length ? <div className="admin-chapter-list">
        {query.data.map((chapter) => <div className="admin-chapter-row" key={chapter.id}>
          <div><strong>Глава {chapter.number}{chapter.name ? ` — ${chapter.name}` : ''}</strong><div className="muted">{chapter.pages_count} страниц</div></div>
          <Space wrap>
            <Tag color={chapter.is_published ? 'green' : basePath === 'author' || authorSubmitted ? 'orange' : 'default'}>{chapter.is_published ? 'Опубликована' : basePath === 'author' ? 'Черновик / на проверку' : authorSubmitted ? 'На проверке автора' : 'Черновик'}</Tag>
            <Button icon={<UploadOutlined />} onClick={() => { setUploadTarget(chapter); setPages([]); pageFileIds.current.clear(); setErrorText(''); }}>Страницы</Button>
            {basePath === 'admin' && <Button icon={chapter.is_published ? <EyeInvisibleOutlined /> : <EyeOutlined />} disabled={!chapter.is_published && chapter.pages_count === 0} loading={toggle.isPending} onClick={() => toggle.mutate(chapter)}>{chapter.is_published ? 'Снять' : 'Опубликовать'}</Button>}
            {(basePath === 'admin' || !chapter.is_published) && <Popconfirm title="Удалить главу и все её страницы?" okText="Удалить" cancelText="Отмена" onConfirm={() => remove.mutate(chapter.id)}><Button danger icon={<DeleteOutlined />} loading={remove.isPending} /></Popconfirm>}
          </Space>
        </div>)}
      </div> : <Empty description="Глав пока нет. Создай первую главу и загрузи страницы." />}
    </Modal>
    <Modal title={`Загрузить страницы · глава ${uploadTarget?.number ?? ''}`} open={!!uploadTarget} onCancel={() => setUploadTarget(null)} onOk={() => uploadMutation.mutate()} okText="Загрузить" cancelText="Отмена" confirmLoading={uploadMutation.isPending} destroyOnHidden>
      {errorText && <Alert type="error" showIcon message={errorText} className="modal-alert" />}
      <Typography.Paragraph type="secondary">Страницы добавляются в конец главы. Выбирай файлы в том порядке, в котором они должны отображаться.</Typography.Paragraph>
      <Upload {...uploadProps} listType="text"><Button icon={<UploadOutlined />}>Выбрать изображения</Button></Upload>
      <Typography.Text type="secondary">Не более 30 изображений за одну загрузку; JPG, PNG, WebP, AVIF — до 15 МБ каждое.</Typography.Text>
    </Modal>
  </>;
}
