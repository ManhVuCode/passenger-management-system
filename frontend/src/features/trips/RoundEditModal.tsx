import { DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import { useEffect, type ReactElement } from 'react';
import type { Round } from '../../types/transport';

interface RoundEditFormValues {
  name: string;
  departureTime: dayjs.Dayjs;
}

interface RoundEditModalProps {
  open: boolean;
  loading: boolean;
  round?: Round | null;
  onCancel: () => void;
  onSubmit: (payload: { name: string; departureTime: string }) => Promise<void>;
}

export default function RoundEditModal({
  open,
  loading,
  round,
  onCancel,
  onSubmit,
}: RoundEditModalProps): ReactElement {
  const [form] = Form.useForm<RoundEditFormValues>();

  useEffect(() => {
    if (open && round) {
      form.setFieldsValue({
        name: round.name,
        departureTime: dayjs(round.departureTime),
      });
    }
    if (!open) {
      form.resetFields();
    }
  }, [form, open, round]);

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit({
      name: values.name,
      departureTime: values.departureTime.toISOString(),
    });
  };

  return (
    <Modal
      title="Edit Round"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      okText="Save"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="Round Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Departure Time" name="departureTime" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: '100%' }} format="HH:mm DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

