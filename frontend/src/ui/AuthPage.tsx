import { useState } from 'react';
import { Alert, Button, Checkbox, Form, Input, Typography, message } from 'antd';
import { LockOutlined, MailOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthProvider';

type Values = { name?: string; email: string; password: string; password_confirmation?: string; remember?: boolean };
export function AuthPage() {
  const [searchParams] = useSearchParams();
  const isRegister = searchParams.get('mode') === 'register';
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();
  async function submit(values: Values) {
    setBusy(true); setError('');
    try {
      if (isRegister) await register({ name: values.name ?? '', email: values.email, password: values.password, password_confirmation: values.password_confirmation ?? '' });
      else await login({ email: values.email, password: values.password, remember: values.remember });
      message.success(isRegister ? 'Аккаунт создан.' : 'Вход выполнен.'); navigate('/');
    } catch (e) {
      if (axios.isAxiosError(e)) {
        const errors = e.response?.data?.errors as Record<string, string[]> | undefined;
        setError(errors ? Object.values(errors).flat().join(' ') : (e.response?.data?.message ?? 'Не удалось выполнить запрос.'));
      } else setError('Не удалось выполнить запрос.');
    } finally { setBusy(false); }
  }
  return <div className="auth-wrap"><div className="auth-card">
    <Typography.Text className="eyebrow">MANGALIB ACCOUNT</Typography.Text>
    <Typography.Title level={2}>{isRegister ? 'Создать аккаунт' : 'С возвращением'}</Typography.Title>
    <Typography.Paragraph type="secondary">{isRegister ? 'Сохраняй библиотеку и историю чтения.' : 'Войди, чтобы открыть свою библиотеку.'}</Typography.Paragraph>
    {error && <Alert type="error" showIcon message={error} />}
    <Form layout="vertical" onFinish={submit} requiredMark={false}>
      {isRegister && <Form.Item name="name" label="Имя" rules={[{ required: true }, { min: 2, max: 80 }]}><Input prefix={<UserOutlined />} size="large" /></Form.Item>}
      <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}><Input prefix={<MailOutlined />} size="large" autoComplete="email" /></Form.Item>
      <Form.Item name="password" label="Пароль" rules={[{ required: true }, ...(isRegister ? [{ min: 10, message: 'Минимум 10 символов.' }] : [])]}><Input.Password prefix={<LockOutlined />} size="large" autoComplete={isRegister ? 'new-password' : 'current-password'} /></Form.Item>
      {isRegister && <Form.Item name="password_confirmation" label="Повтори пароль" dependencies={['password']} rules={[{ required: true }, ({ getFieldValue }) => ({ validator(_, value) { return !value || getFieldValue('password') === value ? Promise.resolve() : Promise.reject(new Error('Пароли не совпадают.')); } })]}><Input.Password prefix={<LockOutlined />} size="large" autoComplete="new-password" /></Form.Item>}
      {!isRegister && <Form.Item name="remember" valuePropName="checked"><Checkbox>Запомнить меня</Checkbox></Form.Item>}
      <Button type="primary" htmlType="submit" size="large" block loading={busy}>{isRegister ? 'Зарегистрироваться' : 'Войти'}</Button>
    </Form>
    <div className="auth-switch">{isRegister ? 'Уже есть аккаунт?' : 'Впервые здесь?'} <Link to={isRegister ? '/login' : '/login?mode=register'}>{isRegister ? 'Войти' : 'Создать аккаунт'}</Link></div>
  </div></div>;
}
