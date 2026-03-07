import { Form, Input, Modal, Select } from 'antd';
import { useEffect, type ReactElement } from 'react';

interface PassengerCreateFormValues {
  fullName: string;
  phone: string;
  busId?: string;
}

interface BusOption {
  value: string;
  label: string;
}

interface PassengerCreateModalProps {
  open: boolean;
  loading: boolean;
  busOptions: BusOption[];
  onCancel: () => void;
  onSubmit: (payload: PassengerCreateFormValues) => Promise<void>;
}

export default function PassengerCreateModal({
  open,
  loading,
  busOptions,
  onCancel,
  onSubmit,
}: PassengerCreateModalProps): ReactElement {
  const [form] = Form.useForm<PassengerCreateFormValues>();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [form, open]);

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title="Add Passenger"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      okText="Add"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="Full Name" name="fullName" rules={[{ required: true }]}> 
          <Input placeholder="Nguyen Van A" />
        </Form.Item>

        <Form.Item label="Phone" name="phone" rules={[{ required: true }]}> 
          <Input placeholder="0987xxxxxx" />
        </Form.Item>

        <Form.Item label="Assign Bus" name="busId">
          <Select
            allowClear
            showSearch
            placeholder="Select bus (optional)"
            options={busOptions}
            optionFilterProp="label"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
