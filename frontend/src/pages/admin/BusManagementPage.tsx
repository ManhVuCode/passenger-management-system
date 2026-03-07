import { PlusOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography, message } from 'antd';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import {
  createBusApi,
  deleteBusApi,
  getBusesApi,
  updateBusApi,
  type CreateBusPayload,
} from '../../api/busApi';
import BusModal, { type BusFormValues } from '../../features/buses/BusModal';
import BusTable from '../../features/buses/BusTable';
import type { Bus } from '../../types/transport';
import { getErrorMessage } from '../../utils/error';

export default function BusManagementPage(): ReactElement {
  const [rows, setRows] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingBusId, setDeletingBusId] = useState<string>();
  const [showModal, setShowModal] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus | null>(null);

  const loadBuses = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const data = await getBusesApi();
      setRows(data.filter((item) => item.status !== 'Inactive'));
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBuses();
  }, [loadBuses]);

  const handleOpenCreate = (): void => {
    setEditingBus(null);
    setShowModal(true);
  };

  const handleOpenEdit = (bus: Bus): void => {
    setEditingBus(bus);
    setShowModal(true);
  };

  const handleSubmit = async (values: BusFormValues): Promise<void> => {
    setSaving(true);
    try {
      if (editingBus) {
        const updated = await updateBusApi(editingBus.id, values);
        setRows((prev) => prev.map((item) => (item.id === editingBus.id ? updated : item)));
        message.success('Bus updated successfully.');
      } else {
        const payload: CreateBusPayload = {
          licensePlate: values.licensePlate,
          busCode: values.busCode,
          seatCount: values.seatCount,
        };
        const created = await createBusApi(payload);
        setRows((prev) => [created, ...prev]);
        message.success('Bus created successfully.');
      }
      setShowModal(false);
      setEditingBus(null);
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bus: Bus): Promise<void> => {
    setDeletingBusId(bus.id);
    try {
      await deleteBusApi(bus.id);
      setRows((prev) => prev.filter((item) => item.id !== bus.id));
      message.success('Bus deleted.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setDeletingBusId(undefined);
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Bus Management
      </Typography.Title>

      <Card style={{ borderRadius: 16 }}>
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreate}>
              Add Bus
            </Button>
          </Space>
          <BusTable
            data={rows}
            loading={loading}
            deletingBusId={deletingBusId}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />
        </Space>
      </Card>

      <BusModal
        open={showModal}
        loading={saving}
        bus={editingBus}
        onCancel={() => {
          setShowModal(false);
          setEditingBus(null);
        }}
        onSubmit={handleSubmit}
      />
    </Space>
  );
}
