import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Badge, Button, Popconfirm, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { ReactElement } from 'react';
import type { Bus } from '../../types/transport';

interface BusTableProps {
  data: Bus[];
  loading: boolean;
  deletingBusId?: string;
  onEdit: (bus: Bus) => void;
  onDelete: (bus: Bus) => Promise<void>;
}

const renderStatus = (status?: string): ReactElement => {
  if (status === 'Maintenance' || status === 'Maintaining') {
    return <Badge status="warning" text="Maintenance" />;
  }
  if (status === 'Inactive') {
    return <Badge status="default" text="Inactive" />;
  }
  return <Badge status="success" text="Active" />;
};

export default function BusTable({
  data,
  loading,
  deletingBusId,
  onEdit,
  onDelete,
}: BusTableProps): ReactElement {
  const columns: ColumnsType<Bus> = [
    {
      title: 'STT',
      width: 72,
      align: 'center',
      render: (_, __, index) => index + 1,
    },
    {
      title: 'License Plate',
      dataIndex: 'licensePlate',
      render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
    },
    {
      title: 'Bus Code',
      dataIndex: 'busCode',
      render: (value?: string) => (value ? <Tag color="blue">{value}</Tag> : '-'),
    },
    {
      title: 'Seat Count',
      dataIndex: 'seatCount',
      width: 120,
      align: 'right',
      render: (value?: number) => value ?? 0,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 150,
      render: (value?: string) => renderStatus(value),
    },
    {
      title: 'Actions',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => onEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete bus"
            description={`Delete ${record.licensePlate}?`}
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => void onDelete(record)}
          >
            <Button
              danger
              size="small"
              loading={deletingBusId === record.id}
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
    <Table<Bus>
      rowKey="id"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={{ pageSize: 10, showSizeChanger: true }}
      bordered
      size="middle"
    />
  );
}

