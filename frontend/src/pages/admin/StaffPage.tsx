import { PlusOutlined, TeamOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { userApi } from '../../api/userApi';
import EditStaffModal from '../../features/staff/EditStaffModal';
import RegisterStaffModal from '../../features/staff/RegisterStaffModal';
import StaffTable from '../../features/staff/StaffTable';
import type { CreateUserPayload, UpdateUserPayload, UserListItem, UserRole } from '../../types/user';
import { getErrorMessage } from '../../utils/error';

export default function StaffPage(): ReactElement {
  const [rows, setRows] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | undefined>();
  const [editingUserId, setEditingUserId] = useState<string | undefined>();
  const [editingUser, setEditingUser] = useState<UserListItem | undefined>();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  const loadUsers = useCallback(async (): Promise<void> => {
    setLoading(true);

    try {
      const response = await userApi.getAll();
      setRows(response.data);
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const handleCreateUser = async (payload: CreateUserPayload): Promise<void> => {
    setSubmitting(true);

    try {
      const response = await userApi.create(payload);
      setRows((prev) => [response.data, ...prev]);
      setShowModal(false);
      message.success('Staff account created.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (user: UserListItem): Promise<void> => {
    setDeletingUserId(user.id);

    try {
      await userApi.remove(user.id);
      setRows((prev) => prev.filter((item) => item.id !== user.id));
      message.success('Staff deleted.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setDeletingUserId(undefined);
    }
  };

  const handleOpenEditModal = (user: UserListItem): void => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleUpdateUser = async (payload: UpdateUserPayload): Promise<void> => {
    if (!editingUser) {
      return;
    }

    setEditing(true);
    setEditingUserId(editingUser.id);

    try {
      const response = await userApi.update(editingUser.id, payload);
      setRows((prev) => prev.map((item) => (item.id === editingUser.id ? response.data : item)));
      setShowEditModal(false);
      setEditingUser(undefined);
      message.success('User information updated.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setEditing(false);
      setEditingUserId(undefined);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card
        bordered={false}
        bodyStyle={{ padding: 14, background: 'linear-gradient(90deg, #0d2747 0%, #1a3f70 100%)' }}
      >
        <Space>
          <TeamOutlined style={{ color: '#fff' }} />
          <Typography.Title level={4} style={{ margin: 0, color: '#fff' }}>
            Staff Management
          </Typography.Title>
        </Space>
      </Card>

      <Card bodyStyle={{ padding: 12 }} style={{ borderRadius: 14, borderColor: '#cfd8e3' }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={10}>
            <Input
              placeholder="Search by name or email"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              value={roleFilter}
              style={{ width: '100%' }}
              onChange={(value) => setRoleFilter(value as 'all' | UserRole)}
              options={[
                { value: 'all', label: 'All Roles' },
                { value: 'DRIVER', label: 'Driver' },
                { value: 'ASSISTANT', label: 'Assistant' },
                { value: 'STAFF', label: 'Staff' },
                { value: 'TENANT_ADMIN', label: 'Tenant Admin' },
              ]}
            />
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowModal(true)}>
              Create Staff
            </Button>
          </Col>
        </Row>
      </Card>

      <StaffTable
        data={rows}
        loading={loading}
        searchKeyword={searchKeyword}
        roleFilter={roleFilter}
        deletingUserId={deletingUserId}
        editingUserId={editingUserId}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteUser}
      />

      <RegisterStaffModal
        open={showModal}
        submitting={submitting}
        onCancel={() => setShowModal(false)}
        onSubmit={handleCreateUser}
      />

      <EditStaffModal
        open={showEditModal}
        submitting={editing}
        user={editingUser}
        onCancel={() => {
          setShowEditModal(false);
          setEditingUser(undefined);
        }}
        onSubmit={handleUpdateUser}
      />
    </Space>
  );
}
