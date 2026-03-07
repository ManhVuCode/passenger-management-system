import { CarOutlined, TeamOutlined } from '@ant-design/icons';
import { Card, Col, Row, Space, Statistic, Typography, message } from 'antd';
import { useEffect, useState, type ReactElement } from 'react';
import { getDashboardStatsApi, type DashboardStats } from '../../api/dashboardApi';
import { getErrorMessage } from '../../utils/error';

export default function DashboardPage(): ReactElement {
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0,
    totalPassengers: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadStats = async (): Promise<void> => {
      setLoading(true);
      try {
        const data = await getDashboardStatsApi();
        setStats(data);
      } catch (error: unknown) {
        message.error(getErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };

    void loadStats();
  }, []);

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Dashboard Overview
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic title="Total Trips" value={stats.totalTrips} loading={loading} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card style={{ borderRadius: 16 }}>
            <Statistic
              title="Total Passengers"
              value={stats.totalPassengers}
              loading={loading}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
      </Row>
    </Space>
  );
}
