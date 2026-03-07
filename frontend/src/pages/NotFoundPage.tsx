import { Button, Result } from 'antd';
import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage(): ReactElement {
  const navigate = useNavigate();

  return (
    <Result
      status="404"
      title="Not Found"
      subTitle="The requested page does not exist."
      extra={
        <Button type="primary" onClick={() => navigate('/admin', { replace: true })}>
          Back to Dashboard
        </Button>
      }
    />
  );
}
