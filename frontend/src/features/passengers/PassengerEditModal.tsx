import { Form, Input, Modal, Select } from 'antd';
import { useEffect, type ReactElement } from 'react';
import type { Passenger } from '../../types/transport';

interface BusOption {
  value: string;
  label: string;
}

interface PassengerEditValues {
  fullName: string;
  phone: string;
  email?: string;
  busId?: string;
}

interface PassengerEditModalProps {
  open: boolean;
  loading: boolean;
  passenger?: Passenger | null;
  busOptions: BusOption[];
  onCancel: () => void;
  onSubmit: (values: PassengerEditValues) => Promise<void>;
}

export default function PassengerEditModal({
  open,
  loading,
  passenger,
  busOptions,
  onCancel,
  onSubmit,
}: PassengerEditModalProps): ReactElement {
  const [form] = Form.useForm<PassengerEditValues>();

  useEffect(() => {
    if (open && passenger) {
      form.setFieldsValue({
        fullName: passenger.fullName,
        phone: passenger.phone,
        email: passenger.email,
        busId: passenger.busId,
      });
    }
    if (!open) {
      form.resetFields();
    }
  }, [form, open, passenger]);

  const handleSubmit = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title="Edit Passenger"
      open={open}
      onCancel={onCancel}
      onOk={() => void handleSubmit()}
      confirmLoading={loading}
      okText="Save"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="Full Name" name="fullName" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Phone" name="phone" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email" rules={[{ type: 'email' }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Assign Bus" name="busId">
          <Select allowClear showSearch optionFilterProp="label" options={busOptions} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

