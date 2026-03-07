import { DatePicker, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import { useEffect, type ReactElement } from 'react';

interface RoundCreateFormValues {
  name: string;
  departureTime: dayjs.Dayjs;
}

interface RoundCreateModalProps {
  open: boolean;
  loading: boolean;
  onCancel: () => void;
  onSubmit: (payload: { name: string; departureTime: string }) => Promise<void>;
}

export default function RoundCreateModal({
  open,
  loading,
  onCancel,
  onSubmit,
}: RoundCreateModalProps): ReactElement {
  const [form] = Form.useForm<RoundCreateFormValues>();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [form, open]);

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit({
      name: values.name,
      departureTime: values.departureTime.toISOString(),
    });
  };

  return (
    <Modal
      title="Add Round"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      okText="Add"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="Round Name" name="name" rules={[{ required: true }]}> 
          <Input placeholder="Outbound" />
        </Form.Item>

        <Form.Item label="Departure Time" name="departureTime" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: '100%' }} format="HH:mm DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
