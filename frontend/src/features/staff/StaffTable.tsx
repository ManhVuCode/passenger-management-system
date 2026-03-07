import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Space, Tag } from 'antd';
import dayjs from 'dayjs';
import type { ReactElement } from 'react';
import type { UserListItem, UserRole } from '../../types/user';

interface StaffTableProps {
  data: UserListItem[];
  loading: boolean;
  searchKeyword: string;
  roleFilter: 'all' | UserRole;
  deletingUserId?: string;
  editingUserId?: string;
  onEdit: (user: UserListItem) => void;
  onDelete: (user: UserListItem) => Promise<void>;
}

const roleColorMap: Record<UserRole, string> = {
  TENANT_ADMIN: 'magenta',
  STAFF: 'blue',
  DRIVER: 'geekblue',
  ASSISTANT: 'cyan',
};

export default function StaffTable({
  data,
  loading,
  searchKeyword,
  roleFilter,
  deletingUserId,
  editingUserId,
  onEdit,
  onDelete,
}: StaffTableProps): ReactElement {
  const filteredRows = data.filter((staff) => {
    const keyword = searchKeyword.trim().toLowerCase();
    const matchesKeyword =
      !keyword ||
      staff.fullName.toLowerCase().includes(keyword) ||
      staff.email.toLowerCase().includes(keyword);

    const matchesRole = roleFilter === 'all' || staff.role === roleFilter;
    return matchesKeyword && matchesRole;
  });

  const columns: ProColumns<UserListItem>[] = [
    {
      title: 'Name',
      dataIndex: 'fullName',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      width: 240,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: 140,
      render: (_, record) => record.phone ?? '-',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      width: 120,
      render: (_, record) => <Tag color={roleColorMap[record.role]}>{record.role}</Tag>,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      width: 160,
      render: (_, record) =>
        record.createdAt ? dayjs(record.createdAt).format('DD/MM/YYYY HH:mm') : '-',
    },
    {
      title: 'Action',
      width: 200,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            icon={<EditOutlined />}
            loading={editingUserId === record.id}
            onClick={() => onEdit(record)}
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete staff account"
            description={`Delete ${record.fullName}?`}
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => void onDelete(record)}
            disabled={record.role === 'TENANT_ADMIN'}
          >
            <Button
              danger
              size="small"
              disabled={record.role === 'TENANT_ADMIN'}
              loading={deletingUserId === record.id}
              icon={<DeleteOutlined />}
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<UserListItem>
      rowKey="id"
      size="small"
      search={false}
      cardBordered
      options={false}
      loading={loading}
      columns={columns}
      dataSource={filteredRows}
      pagination={{ pageSize: 12, showSizeChanger: true }}
      bordered
    />
  );
}
