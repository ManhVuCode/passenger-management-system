import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App as AntApp, ConfigProvider, theme } from 'antd';
import enUS from 'antd/locale/en_US';
import 'antd/dist/reset.css';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';
import AppRoutes from './routes/AppRoutes';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ConfigProvider
      locale={enUS}
      theme={{
        algorithm: [theme.defaultAlgorithm],
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
          colorText: '#1f1f1f',
          colorTextSecondary: '#595959',
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
