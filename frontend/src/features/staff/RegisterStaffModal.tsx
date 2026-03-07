import { Form, Input, Modal, Select } from 'antd';
import { useEffect, type ReactElement } from 'react';
import type { CreateUserPayload } from '../../types/user';

interface RegisterStaffModalProps {
  open: boolean;
  submitting: boolean;
  onCancel: () => void;
  onSubmit: (values: CreateUserPayload) => Promise<void>;
}

export default function RegisterStaffModal({
  open,
  submitting,
  onCancel,
  onSubmit,
}: RegisterStaffModalProps): ReactElement {
  const [form] = Form.useForm<CreateUserPayload>();

  useEffect(() => {
    if (!open) {
      form.resetFields();
    }
  }, [form, open]);

  const handleOk = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      title="Register New Staff"
      open={open}
      okText="Create Account"
      cancelText="Cancel"
      onCancel={onCancel}
      confirmLoading={submitting}
      onOk={() => void handleOk()}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input placeholder="driver@tenant.com" />
        </Form.Item>

        <Form.Item name="password" label="Password" rules={[{ required: true, min: 6 }]}>
          <Input.Password placeholder="At least 6 characters" />
        </Form.Item>

        <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
          <Input placeholder="Nguyen Van A" />
        </Form.Item>

        <Form.Item name="phone" label="Phone Number">
          <Input placeholder="0987xxxxxx" />
        </Form.Item>

        <Form.Item<CreateUserPayload>
          name="role"
          label="Role"
          initialValue="DRIVER"
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { value: 'DRIVER', label: 'Driver' },
              { value: 'ASSISTANT', label: 'Assistant' },
              { value: 'STAFF', label: 'Staff' },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
