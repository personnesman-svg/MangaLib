import { Alert, Button, Result, Skeleton } from 'antd';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

export function ProtectedRoute({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <Skeleton active />;
  if (!user) return <Result status="403" title="Нужен вход в аккаунт" subTitle="Войди, чтобы открыть этот раздел." extra={<Link to="/login"><Button type="primary">Войти</Button></Link>} />;
  if (admin && user.role !== 'admin') return <Alert type="error" showIcon message="Недостаточно прав" description="Этот раздел доступен только администраторам." />;
  return <>{children}</>;
}
