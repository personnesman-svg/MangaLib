import { Layout, Menu, Input, Typography, Space, Button, Dropdown, Avatar } from 'antd';
import { BookOutlined, SearchOutlined, UserOutlined, LogoutOutlined, SettingOutlined, HeartOutlined, FormOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { message } from 'antd';

const { Header, Content, Footer } = Layout;
export function AppShell() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [search, setSearch] = useState(params.get('search') ?? '');
  useEffect(() => setSearch(params.get('search') ?? ''), [params]);
  const { user, logout } = useAuth();
  async function handleLogout() { try { await logout(); message.success('Ты вышел из аккаунта.'); navigate('/'); } catch { message.error('Не удалось выйти.'); } }
  const menuItems = [
    ...(user ? [{ key: 'library', icon: <HeartOutlined />, label: 'Моя библиотека', onClick: () => navigate('/library') }] : []),
    ...(user?.role === 'user' ? [{ key: 'author-application', icon: <FormOutlined />, label: 'Стать автором', onClick: () => navigate('/author') }] : []),
    ...(user?.role === 'author' ? [{ key: 'author', icon: <FormOutlined />, label: 'Кабинет автора', onClick: () => navigate('/author') }] : []),
    ...(user?.role === 'admin' ? [{ key: 'admin', icon: <SettingOutlined />, label: 'Админка', onClick: () => navigate('/admin') }] : []),
    ...(user ? [{ key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', onClick: () => void handleLogout() }] : []),
  ];
  return <Layout className="app-layout">
    <Header className="site-header"><div className="header-inner">
      <button className="brand" onClick={() => navigate('/')} aria-label="На главную"><BookOutlined /><span>MANGA<span className="brand-accent">LIB</span></span></button>
      <Menu theme="dark" mode="horizontal" selectable={false} className="top-menu" items={[{ key: 'catalog', label: 'Каталог', onClick: () => navigate('/') }]} />
      <Input className="header-search" allowClear value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Поиск по каталогу" prefix={<SearchOutlined />} onPressEnter={() => navigate(search.trim() ? `/?search=${encodeURIComponent(search.trim())}` : '/')} />
      {user ? <Dropdown menu={{ items: menuItems }} placement="bottomRight"><Button className="account-button"><Avatar size="small" icon={<UserOutlined />} /> <span className="account-name">{user.name}</span></Button></Dropdown> : <Space><Link to="/login"><Button>Войти</Button></Link><Link to="/login?mode=register"><Button type="primary">Регистрация</Button></Link></Space>}
    </div></Header>
    <Content className="main-content"><Outlet /></Content>
    <Footer className="site-footer"><Space direction="vertical" size={2}><Typography.Text type="secondary">MangaLib · твоя личная библиотека манги</Typography.Text><Typography.Text type="secondary">Каталог наполняется владельцем сайта.</Typography.Text></Space></Footer>
  </Layout>;
}
