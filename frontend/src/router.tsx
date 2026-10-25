import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './ui/AppShell';
import { CatalogPage } from './ui/CatalogPage';
import { TitlePage } from './ui/TitlePage';
import { ReaderPage } from './ui/ReaderPage';
import { AdminPage } from './ui/AdminPage';
import { AuthorPage } from './ui/AuthorPage';
import { AuthPage } from './ui/AuthPage';
import { LibraryPage } from './ui/LibraryPage';
import { ProtectedRoute } from './ui/ProtectedRoute';
import { NotFoundPage } from './ui/NotFoundPage';

export const router = createBrowserRouter([{
  path: '/', element: <AppShell />, errorElement: <NotFoundPage />,
  children: [
    { index: true, element: <CatalogPage /> },
    { path: 'title/:slug', element: <TitlePage /> },
    { path: 'read/:chapterId', element: <ReaderPage /> },
    { path: 'login', element: <AuthPage /> },
    { path: 'library', element: <ProtectedRoute><LibraryPage /></ProtectedRoute> },
    { path: 'admin', element: <ProtectedRoute admin><AdminPage /></ProtectedRoute> },
    { path: 'author', element: <ProtectedRoute><AuthorPage /></ProtectedRoute> },
  ],
}]);
