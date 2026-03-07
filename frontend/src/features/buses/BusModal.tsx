import { Form, Input, InputNumber, Modal } from 'antd';
import { useEffect, type ReactElement } from 'react';
import type { Bus } from '../../types/transport';

export interface BusFormValues {
  licensePlate: string;
  busCode?: string;
  seatCount?: number;
}

interface BusModalProps {
  open: boolean;
  loading: boolean;
  bus?: Bus | null;
  onCancel: () => void;
  onSubmit: (values: BusFormValues) => Promise<void>;
}

export default function BusModal({
  open,
  loading,
  bus,
  onCancel,
  onSubmit,
}: BusModalProps): ReactElement {
  const [form] = Form.useForm<BusFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        licensePlate: bus?.licensePlate ?? '',
        busCode: bus?.busCode ?? '',
        seatCount: bus?.seatCount ?? 45,
      });
    } else {
      form.resetFields();
    }
  }, [bus, form, open]);

  const handleOk = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      open={open}
      title={bus ? 'Edit Bus' : 'Add Bus'}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      confirmLoading={loading}
      destroyOnClose
      okText={bus ? 'Update' : 'Create'}
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item
          label="License Plate"
          name="licensePlate"
          rules={[{ required: true, message: 'License plate is required' }]}
        >
          <Input placeholder="29B-999.99" />
        </Form.Item>
        <Form.Item label="Bus Code" name="busCode">
          <Input placeholder="BUS-01" />
        </Form.Item>
        <Form.Item label="Seat Count" name="seatCount">
          <InputNumber min={1} max={100} style={{ width: '100%' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
}

