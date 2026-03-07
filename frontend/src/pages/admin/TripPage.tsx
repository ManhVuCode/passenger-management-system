import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Space, Table, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import TripCreateModal from '../../features/trips/TripCreateModal';
import TripEditModal from '../../features/trips/TripEditModal';
import { createTripApi, deleteTripApi, getTripsApi, updateTripApi } from '../../api/tripApi';
import type { Trip } from '../../types/transport';
import { getErrorMessage } from '../../utils/error';

export default function TripPage(): ReactElement {
  const [rows, setRows] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deletingTripId, setDeletingTripId] = useState<string>();
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const navigate = useNavigate();

  const loadTrips = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getTripsApi();
      setRows(data);
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrips();
  }, [loadTrips]);

  const handleCreateTrip = async (payload: {
    name: string;
    startDate?: string;
    endDate?: string;
  }): Promise<void> => {
    setCreating(true);
    try {
      const created = await createTripApi(payload);
      setRows((prev) => [created, ...prev]);
      setShowCreateModal(false);
      message.success('Trip created successfully.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleOpenEdit = (trip: Trip): void => {
    setEditingTrip(trip);
    setShowEditModal(true);
  };

  const handleUpdateTrip = async (payload: {
    name: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<void> => {
    if (!editingTrip) {
      return;
    }

    setUpdating(true);
    try {
      const updated = await updateTripApi(editingTrip.id, payload);
      setRows((prev) => prev.map((item) => (item.id === editingTrip.id ? updated : item)));
      setShowEditModal(false);
      setEditingTrip(null);
      message.success('Trip updated successfully.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTrip = async (trip: Trip): Promise<void> => {
    setDeletingTripId(trip.id);
    try {
      await deleteTripApi(trip.id);
      setRows((prev) => prev.filter((item) => item.id !== trip.id));
      message.success('Trip deleted.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setDeletingTripId(undefined);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card
        bodyStyle={{
          padding: 16,
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,21,41,.08)',
        }}
      >
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={4} style={{ margin: 0, color: '#1f1f1f' }}>
            Trips
          </Typography.Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>
            Create Trip
          </Button>
        </Space>
      </Card>

      <Card style={{ boxShadow: '0 1px 4px rgba(0,21,41,.08)' }} bodyStyle={{ padding: 12 }}>
        <Table<Trip>
          rowKey="id"
          loading={loading}
          size="middle"
          dataSource={rows}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Name', dataIndex: 'name' },
            {
              title: 'Start Date',
              dataIndex: 'startDate',
              render: (value: string | undefined) =>
                value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
            },
            {
              title: 'End Date',
              dataIndex: 'endDate',
              render: (value: string | undefined) =>
                value ? dayjs(value).format('DD/MM/YYYY HH:mm') : '-',
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (value: string | undefined) => <Tag color="blue">{value ?? 'Doing'}</Tag>,
            },
            {
              title: 'Action',
              width: 280,
              render: (_, record) => (
                <Space>
                  <Button type="link" onClick={() => navigate(`/admin/trips/${record.id}`)}>
                    View Detail
                  </Button>
                  <Button icon={<EditOutlined />} size="small" onClick={() => handleOpenEdit(record)}>
                    Edit
                  </Button>
                  <Popconfirm
                    title="Delete trip"
                    description="Are you sure you want to delete this trip?"
                    okText="Delete"
                    cancelText="Cancel"
                    onConfirm={() => void handleDeleteTrip(record)}
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={deletingTripId === record.id}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <TripCreateModal
        open={showCreateModal}
        loading={creating}
        onCancel={() => setShowCreateModal(false)}
        onSubmit={handleCreateTrip}
      />

      <TripEditModal
        open={showEditModal}
        loading={updating}
        trip={editingTrip}
        onCancel={() => {
          setShowEditModal(false);
          setEditingTrip(null);
        }}
        onSubmit={handleUpdateTrip}
      />
    </Space>
  );
}
