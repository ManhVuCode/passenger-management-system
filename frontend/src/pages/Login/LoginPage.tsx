import { Card, Typography } from 'antd';
import type { ReactElement } from 'react';
import LoginForm from '../../features/auth/LoginForm';

export default function LoginPage(): ReactElement {
  return (
    <Card style={{ borderRadius: 20, boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        Welcome Back
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Sign in to manage trips, buses, passengers, and attendance.
      </Typography.Paragraph>

      <LoginForm />
    </Card>
  );
}
