import { DatePicker, Form, Input, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useEffect, type ReactElement } from 'react';
import type { Trip } from '../../types/transport';

interface TripEditFormValues {
  name: string;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  status?: string;
}

interface TripEditModalProps {
  open: boolean;
  loading: boolean;
  trip?: Trip | null;
  onCancel: () => void;
  onSubmit: (payload: { name: string; startDate?: string; endDate?: string; status?: string }) => Promise<void>;
}

export default function TripEditModal({
  open,
  loading,
  trip,
  onCancel,
  onSubmit,
}: TripEditModalProps): ReactElement {
  const [form] = Form.useForm<TripEditFormValues>();

  useEffect(() => {
    if (open && trip) {
      form.setFieldsValue({
        name: trip.name,
        startDate: trip.startDate ? dayjs(trip.startDate) : undefined,
        endDate: trip.endDate ? dayjs(trip.endDate) : undefined,
        status: trip.status ?? 'Doing',
      });
    }

    if (!open) {
      form.resetFields();
    }
  }, [form, open, trip]);

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit({
      name: values.name,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
      status: values.status,
    });
  };

  return (
    <Modal
      title="Edit Trip"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      okText="Save"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="Trip Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Start Date" name="startDate">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="End Date" name="endDate">
          <DatePicker showTime style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select
            options={[
              { value: 'Doing', label: 'Doing' },
              { value: 'Completed', label: 'Completed' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

