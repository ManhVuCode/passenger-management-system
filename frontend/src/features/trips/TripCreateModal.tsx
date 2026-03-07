import { DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import { useEffect, type ReactElement } from 'react';

interface TripCreateFormValues {
  name: string;
  startDate?: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
}

interface TripCreateModalProps {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: { name: string; startDate?: string; endDate?: string }) => Promise<void>;
}

export default function TripCreateModal({
  open,
  loading,
  onCancel,
  onSubmit,
}: TripCreateModalProps): ReactElement {
  const [form] = Form.useForm<TripCreateFormValues>();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [form, open]);

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit({
      name: values.name,
      startDate: values.startDate?.toISOString(),
      endDate: values.endDate?.toISOString(),
    });
  };

  return (
    <Modal
      title="Create Trip"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      okText="Create"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="Trip Name" name="name" rules={[{ required: true }]}> 
          <Input placeholder="Hanoi - Sapa" />
        </Form.Item>

        <Form.Item label="Start Date" name="startDate">
          <DatePicker style={{ width: '100%' }} showTime />
        </Form.Item>

        <Form.Item label="End Date" name="endDate">
          <DatePicker style={{ width: '100%' }} showTime />
        </Form.Item>
      </Form>
    </Modal>
  );
}
