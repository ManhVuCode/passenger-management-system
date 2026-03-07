import { Form, Modal, Select } from 'antd';
import { useEffect, type ReactElement } from 'react';
import type { Bus } from '../../types/transport';
import type { UserListItem } from '../../types/user';

interface AssignmentFormValues {
  busId: string;
  driverId: string;
}

interface ResourceAssignmentModalProps {
  open: boolean;
  loading: boolean;
  title?: string;
  buses: Bus[];
  drivers: UserListItem[];
  initialValues?: Partial<AssignmentFormValues>;
  onCancel: () => void;
  onSubmit: (values: AssignmentFormValues) => Promise<void>;
}

export default function ResourceAssignmentModal({
  open,
  loading,
  title,
  buses,
  drivers,
  initialValues,
  onCancel,
  onSubmit,
}: ResourceAssignmentModalProps): ReactElement {
  const [form] = Form.useForm<AssignmentFormValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        busId: initialValues?.busId,
        driverId: initialValues?.driverId,
      });
    } else {
      form.resetFields();
    }
  }, [form, initialValues?.busId, initialValues?.driverId, open]);

  const handleOk = async (): Promise<void> => {
    const values = await form.validateFields();
    await onSubmit(values);
  };

  return (
    <Modal
      title={title ?? 'Assign Resource'}
      open={open}
      onCancel={onCancel}
      onOk={() => void handleOk()}
      confirmLoading={loading}
      okText="Save"
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false}>
        <Form.Item label="Select Bus" name="busId" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={buses.map((bus) => ({
              value: bus.id,
              label: bus.busCode ? `${bus.busCode} (${bus.licensePlate})` : bus.licensePlate,
            }))}
            placeholder="Choose bus"
          />
        </Form.Item>

        <Form.Item label="Select Driver" name="driverId" rules={[{ required: true }]}>
          <Select
            showSearch
            optionFilterProp="label"
            options={drivers.map((driver) => ({
              value: driver.id,
              label: driver.fullName ? `${driver.fullName} (${driver.email})` : driver.email,
            }))}
            placeholder="Choose driver"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
