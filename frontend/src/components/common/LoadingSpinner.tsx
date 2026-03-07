import { Flex, Spin } from 'antd';
import type { ReactElement } from 'react';

interface LoadingSpinnerProps {
  fullScreen?: boolean;
}

export default function LoadingSpinner({ fullScreen = false }: LoadingSpinnerProps): ReactElement {
  return (
    <Flex
      align="center"
      justify="center"
      style={{ minHeight: fullScreen ? '100vh' : 240, width: '100%' }}
    >
      <Spin size="large" />
    </Flex>
  );
}
