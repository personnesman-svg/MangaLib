import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, theme } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { router } from './router';
import 'antd/dist/reset.css';
import './styles.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } } });
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: {
      colorPrimary: '#b49aff', colorBgBase: '#101014', colorBgContainer: '#19191f',
      borderRadius: 12, fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
    } }}>
      <QueryClientProvider client={queryClient}><AuthProvider><RouterProvider router={router} /></AuthProvider></QueryClientProvider>
    </ConfigProvider>
  </React.StrictMode>,
);
