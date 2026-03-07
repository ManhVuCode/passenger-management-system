import { Layout } from 'antd';
import type { PropsWithChildren, ReactElement } from 'react';

export default function AuthLayout({ children }: PropsWithChildren): ReactElement {
  return (
    <Layout
      style={{
        minHeight: '100vh',
        padding: 24,
        background:
          'radial-gradient(circle at 12% 18%, #dbeafe 0%, #eef2ff 42%, #f0fdf4 100%)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440, margin: 'auto' }}>{children}</div>
    </Layout>
  );
}
