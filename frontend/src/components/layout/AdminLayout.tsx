import {
  CheckSquareOutlined,
  CarOutlined,
  DashboardOutlined,
  LogoutOutlined,
  TeamOutlined,
  UsergroupAddOutlined,
} from '@ant-design/icons';
import { Button, Layout, Menu, Space, Typography, type MenuProps } from 'antd';
import { useState, type ReactElement } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const { Header, Content, Sider } = Layout;
const SIDER_WIDTH = 200;

const menuItems: MenuProps['items'] = [
  { key: '/admin', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: '/admin/trips', icon: <TeamOutlined />, label: 'Trip Management' },
  { key: '/admin/buses', icon: <CarOutlined />, label: 'Bus Management' },
  { key: '/admin/attendance', icon: <CheckSquareOutlined />, label: 'Attendance Desk' },
  { key: '/admin/staff', icon: <UsergroupAddOutlined />, label: 'Staff Management' },
];

const getSelectedKey = (pathname: string): string => {
  if (pathname.startsWith('/admin/trips')) {
    return '/admin/trips';
  }

  if (pathname.startsWith('/admin/buses')) {
    return '/admin/buses';
  }

  if (pathname.startsWith('/admin/attendance')) {
    return '/admin/attendance';
  }

  if (pathname.startsWith('/admin/staff')) {
    return '/admin/staff';
  }

  return '/admin';
};

export default function AdminLayout(): ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const onMenuClick: MenuProps['onClick'] = ({ key }): void => {
    if (typeof key === 'string') {
      navigate(key);
    }
  };

  const onLogout = (): void => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Sider
        width={SIDER_WIDTH}
        theme="light"
        breakpoint="lg"
        collapsedWidth="0"
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{
          background: '#ffffff',
          borderRight: '1px solid #e6e6e6',
          position: 'fixed',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          zIndex: 1000,
          height: '100vh',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            height: 64,
            display: 'grid',
            placeItems: 'center',
            borderBottom: '1px solid #f0f0f0',
            color: '#1f1f1f',
            fontWeight: 700,
          }}
        >
          <Typography.Text strong style={{ color: '#1f1f1f' }}>
            Passenger Admin
          </Typography.Text>
        </div>

        <Menu
          mode="inline"
          items={menuItems}
          selectedKeys={[getSelectedKey(location.pathname)]}
          onClick={onMenuClick}
          style={{ borderInlineEnd: 'none', background: '#ffffff', fontWeight: 600 }}
        />
      </Sider>

      <Layout
        style={{
          marginLeft: collapsed ? 0 : SIDER_WIDTH,
          transition: 'margin-left 0.2s ease',
          minHeight: '100vh',
        }}
      >
        <Header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff',
            borderBottom: '1px solid #f0f0f0',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
            paddingInline: 16,
          }}
        >
          <Space>
            <Typography.Title level={5} style={{ margin: 0, color: '#1f1f1f', fontWeight: 700 }}>
              Tenant Admin Workspace
            </Typography.Title>
          </Space>

          <Space>
            <Typography.Text style={{ color: '#595959', fontWeight: 600 }}>{user?.email}</Typography.Text>
            <Button size="small" icon={<LogoutOutlined />} onClick={onLogout}>
              Logout
            </Button>
          </Space>
        </Header>

        <Content style={{ padding: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
