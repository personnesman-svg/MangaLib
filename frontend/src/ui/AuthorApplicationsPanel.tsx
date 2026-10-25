import { useState } from 'react';
import { Alert, Button, Input, Modal, Popconfirm, Select, Space, Table, Tag, Typography, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { api } from '../api/client';

type AuthorApplication = {
  id: number;
  user_id: number;
  user_name: string | null;
  user_email: string | null;
  pen_name: string;
  portfolio_url: string | null;
  social_links: string | null;
  motivation: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  created_at: string;
};

function apiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const errors = error.response?.data?.errors as Record<string, string[]> | undefined;
    return errors ? Object.values(errors).flat().join(' ') : error.response?.data?.message ?? 'Ошибка запроса.';
  }
  return 'Ошибка запроса.';
}

export function AuthorApplicationsPanel() {
  const client = useQueryClient();
  const [rejecting, setRejecting] = useState<AuthorApplication | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const query = useQuery({
    queryKey: ['admin-author-applications', statusFilter],
    queryFn: async () => (await api.get<{ data: AuthorApplication[] }>('/admin/author-applications', { params: { status: statusFilter, per_page: 100 } })).data.data,
  });
  const review = useMutation({
    mutationFn: async (input: { application: AuthorApplication; status: 'approved' | 'rejected'; admin_note?: string }) =>
      api.post(`/admin/author-applications/${input.application.id}/review`, { status: input.status, admin_note: input.admin_note }),
    onSuccess: async (_response, input) => {
      message.success(input.status === 'approved' ? `Заявка ${input.application.pen_name} одобрена. Пользователю выдан статус автора.` : `Заявка ${input.application.pen_name} отклонена.`);
      setRejecting(null); setAdminNote('');
      await Promise.all([
        client.invalidateQueries({ queryKey: ['admin-author-applications'] }),
        client.invalidateQueries({ queryKey: ['admin-titles'] }),
      ]);
    },
    onError: (error) => message.error(apiError(error)),
  });

  const columns: ColumnsType<AuthorApplication> = [
    {
      title: 'Заявитель', key: 'applicant', render: (_value, item) => <div>
        <strong>{item.user_name ?? 'Удалённый пользователь'}</strong>
        <div className="muted">{item.user_email ?? 'Email недоступен'}</div>
      </div>,
    },
    { title: 'Псевдоним', dataIndex: 'pen_name', key: 'pen_name' },
    {
      title: 'Портфолио', dataIndex: 'portfolio_url', key: 'portfolio_url', render: (value: string | null) => value ? <a href={value} target="_blank" rel="noreferrer">Открыть</a> : '—',
    },
    {
      title: 'Заявка', dataIndex: 'motivation', key: 'motivation', render: (value: string, item) => <div className="author-application-text">
        <Typography.Paragraph ellipsis={{ rows: 3, expandable: true, symbol: 'ещё' }} style={{ marginBottom: 4 }}>{value}</Typography.Paragraph>
        {item.social_links && <Typography.Text type="secondary">Ссылки: {item.social_links}</Typography.Text>}
      </div>,
    },
    { title: 'Дата', dataIndex: 'created_at', key: 'created_at', render: (value: string) => new Date(value).toLocaleDateString() },
    {
      title: 'Решение', key: 'actions', render: (_value, item) => item.status === 'pending' ? <Space wrap>
        <Popconfirm title="Одобрить заявку и выдать роль автора?" description="После одобрения пользователь сможет отправлять тайтлы и главы на модерацию." okText="Одобрить" cancelText="Отмена" onConfirm={() => review.mutate({ application: item, status: 'approved' })}>
          <Button type="primary" icon={<CheckOutlined />} loading={review.isPending}>Одобрить</Button>
        </Popconfirm>
        <Button danger icon={<CloseOutlined />} onClick={() => { setRejecting(item); setAdminNote(''); }}>Отклонить</Button>
      </Space> : <Tag color={item.status === 'approved' ? 'green' : 'red'}>{item.status === 'approved' ? 'Одобрена' : 'Отклонена'}</Tag>,
    },
  ];

  return <section className="author-applications-panel">
    <div className="section-heading">
      <div><Typography.Title level={3}>Заявки на статус автора</Typography.Title><Typography.Text type="secondary">Одобрение выдаёт роль автора; публикация тайтлов и глав остаётся под модерацией.</Typography.Text></div>
      <Space wrap>
        <Select value={statusFilter} onChange={setStatusFilter} options={[{ value: 'pending', label: 'На рассмотрении' }, { value: 'approved', label: 'Одобренные' }, { value: 'rejected', label: 'Отклонённые' }, { value: 'all', label: 'Все заявки' }]} style={{ minWidth: 170 }} />
        <Button icon={<ReloadOutlined />} onClick={() => void query.refetch()}>Обновить</Button>
      </Space>
    </div>
    {query.isError && <Alert type="error" showIcon message="Не удалось загрузить заявки" description={apiError(query.error)} />}
    <Table
      rowKey="id"
      loading={query.isLoading}
      columns={columns}
      dataSource={query.data ?? []}
      scroll={{ x: 1050 }}
      pagination={{ pageSize: 5 }}
      locale={{ emptyText: statusFilter === 'pending' ? 'Заявок на рассмотрении пока нет.' : 'Заявок в этой категории пока нет.' }}
      expandable={{ expandedRowRender: (item) => <div className="author-application-details"><Typography.Text strong>План автора</Typography.Text><p>{item.motivation}</p>{item.social_links && <><Typography.Text strong>Ссылки</Typography.Text><p>{item.social_links}</p></>}</div> }}
    />
    <Modal
      title={`Отклонить заявку · ${rejecting?.pen_name ?? ''}`}
      open={!!rejecting}
      onCancel={() => { setRejecting(null); setAdminNote(''); }}
      onOk={() => rejecting && review.mutate({ application: rejecting, status: 'rejected', admin_note: adminNote })}
      confirmLoading={review.isPending}
      okText="Отклонить заявку"
      cancelText="Отмена"
      okButtonProps={{ danger: true }}
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary">Оставь комментарий, чтобы заявитель понимал, что нужно исправить. Его увидят в кабинете автора.</Typography.Paragraph>
      <Input.TextArea value={adminNote} onChange={(event) => setAdminNote(event.target.value)} rows={4} maxLength={5000} showCount placeholder="Причина отказа или рекомендации…" />
    </Modal>
  </section>;
}
