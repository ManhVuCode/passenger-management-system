import { Form, Input, Modal } from 'antd';
import { useEffect, type ReactElement } from 'react';
import type { UpdateUserPayload, UserListItem } from '../../types/user';

interface EditStaffModalProps {
  open: boolean;
  submitting: boolean;
  user?: UserListItem;
  onCancel: () => void;
  onSubmit: (values: UpdateUserPayload) => Promise<void>;
}

export default function EditStaffModal({
  open,
  submitting,
  user,
  onCancel,
  onSubmit,
}: EditStaffModalProps): ReactElement {
  const [form] = Form.useForm<UpdateUserPayload>();

  useEffect(() => {
    if (open && user) {
      form.setFieldsValue({
        fullName: user.fullName,
        phone: user.phone,
      });
    }

    if (!open) {
      form.resetFields();
    }
  }, [form, open, user]);

  const handleOk = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title="Edit User Information"
      open={open}
      okText="Save Changes"
      cancelText="Cancel"
      onCancel={onCancel}
      confirmLoading={submitting}
      onOk={() => void handleOk()}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item name="fullName" label="Full Name" rules={[{ required: true }]}>
          <Input placeholder="Nguyen Van A" />
        </Form.Item>
        <Form.Item name="phone" label="Phone Number">
          <Input placeholder="0987xxxxxx" />
        </Form.Item>
      </Form>
    </Modal>
  );
}

