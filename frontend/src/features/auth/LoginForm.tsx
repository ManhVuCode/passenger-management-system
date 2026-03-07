import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Form, Input, message } from 'antd';
import { useMemo, useState, type ReactElement } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { LoginRequest } from '../../types/auth';
import { getErrorMessage } from '../../utils/error';

const getRedirectPath = (value: string | null): string => {
  if (!value) {
    return '/admin';
  }

  const decoded = decodeURIComponent(value);
  return decoded.startsWith('/') ? decoded : '/admin';
};

export default function LoginForm(): ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectPath = useMemo(() => getRedirectPath(searchParams.get('redirect')), [searchParams]);

  const onFinish = async (values: LoginRequest): Promise<void> => {
    setIsSubmitting(true);

    try {
      await login(values);
      message.success('Login successful.');
      navigate(redirectPath, { replace: true });
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form<LoginRequest> layout="vertical" onFinish={onFinish} autoComplete="off">
      <Form.Item
        label="Email"
        name="email"
        rules={[
          { required: true, message: 'Please enter your email.' },
          { type: 'email', message: 'Email format is invalid.' },
        ]}
      >
        <Input size="large" prefix={<UserOutlined />} placeholder="admin@company.com" />
      </Form.Item>

      <Form.Item
        label="Password"
        name="password"
        rules={[{ required: true, message: 'Please enter your password.' }]}
      >
        <Input.Password size="large" prefix={<LockOutlined />} placeholder="Your password" />
      </Form.Item>

      <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
        Sign In
      </Button>
    </Form>
  );
}
