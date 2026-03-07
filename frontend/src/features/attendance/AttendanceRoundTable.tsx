import { ProTable, type ProColumns } from '@ant-design/pro-components';
import { SwapOutlined } from '@ant-design/icons';
import { Button, Checkbox, Input, Modal, Select, Space, Tag, Typography } from 'antd';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useMemo, useState, type ReactElement } from 'react';
import type { AttendanceRow } from './attendance.types';

interface AttendanceRoundTableProps {
  roundTitle: string;
  roundId: string;
  rows: AttendanceRow[];
  loading: boolean;
  savingKeys: string[];
  tripBusOptions: Array<{ value: string; label: string }>;
  onChangePassengerBus: (row: AttendanceRow, busId: string) => Promise<void>;
  onToggleRound: (row: AttendanceRow, roundId: string, checked: boolean) => Promise<void>;
  onNoteChange: (passengerId: string, roundId: string, value: string) => void;
  onSaveNote: (row: AttendanceRow, roundId: string) => Promise<void>;
}

export default function AttendanceRoundTable({
  roundTitle,
  roundId,
  rows,
  loading,
  savingKeys,
  tripBusOptions,
  onChangePassengerBus,
  onToggleRound,
  onNoteChange,
  onSaveNote,
}: AttendanceRoundTableProps): ReactElement {
  const [busSwapTarget, setBusSwapTarget] = useState<AttendanceRow | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | undefined>();

  const exportRows = useMemo(
    () =>
      rows.map((row, index) => ({
        STT: index + 1,
        'Bus License Plate': row.busLabel,
        'Passenger Name': row.passengerName,
        Phone: row.phone,
        Status: row.roundRecords[roundId]?.isPresent ? 'Present' : 'Absent',
        Note: row.noteByRound[roundId] ?? '',
      })),
    [roundId, rows],
  );

  const handleExportExcel = (): void => {
    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const fileName = `Attendance_${roundTitle}_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const columns: ProColumns<AttendanceRow>[] = [
    {
      title: 'STT',
      width: 64,
      align: 'center',
      render: (_, __, index) => <Typography.Text>{index + 1}</Typography.Text>,
    },
    {
      title: 'Bus',
      dataIndex: 'busLabel',
      width: 160,
      render: (_, record) => (
        <Space size={6}>
          {record.busId ? <Tag color="blue">{record.busLabel}</Tag> : <Tag>Unassigned</Tag>}
          <Button
            size="small"
            icon={<SwapOutlined />}
            loading={savingKeys.includes(`bus:${record.passengerId}`)}
            onClick={() => {
              setBusSwapTarget(record);
              setSelectedBusId(record.busId);
            }}
          >
            Swap
          </Button>
        </Space>
      ),
    },
    {
      title: 'Passenger Name',
      dataIndex: 'passengerName',
      width: 220,
    },
    {
      title: roundTitle,
      align: 'center',
      width: 120,
      render: (_, record) => (
        <Checkbox
          checked={Boolean(record.roundRecords[roundId]?.isPresent)}
          disabled={savingKeys.includes(`${roundId}:${record.passengerId}`)}
          onChange={(event) => void onToggleRound(record, roundId, event.target.checked)}
        />
      ),
    },
    {
      title: 'Note',
      dataIndex: 'noteByRound',
      width: 260,
      render: (_, record) => (
        <Space.Compact style={{ width: '100%' }}>
          <Input
            size="small"
            value={record.noteByRound[roundId]}
            onChange={(event) => onNoteChange(record.passengerId, roundId, event.target.value)}
            onPressEnter={() => void onSaveNote(record, roundId)}
          />
          <Button
            size="small"
            type="primary"
            loading={savingKeys.includes(`note:${roundId}:${record.passengerId}`)}
            onClick={() => void onSaveNote(record, roundId)}
          >
            Save
          </Button>
        </Space.Compact>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: 150,
    },
  ];

  return (
    <>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 8 }}>
        <Typography.Text strong>{roundTitle}</Typography.Text>
        <Button type="primary" style={{ backgroundColor: '#52c41a' }} onClick={handleExportExcel}>
          Export Excel
        </Button>
      </Space>

      <ProTable<AttendanceRow>
        rowKey="key"
        size="small"
        search={false}
        options={false}
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        bordered
        scroll={{ x: 900 }}
      />

      <Modal
        title="Change Assigned Bus"
        open={Boolean(busSwapTarget)}
        onCancel={() => {
          setBusSwapTarget(null);
          setSelectedBusId(undefined);
        }}
        onOk={() => {
          if (busSwapTarget && selectedBusId) {
            void onChangePassengerBus(busSwapTarget, selectedBusId);
            setBusSwapTarget(null);
            setSelectedBusId(undefined);
          }
        }}
        okButtonProps={{ disabled: !selectedBusId }}
        destroyOnClose
      >
        <Typography.Paragraph style={{ marginBottom: 12 }}>
          Passenger: <strong>{busSwapTarget?.passengerName}</strong>
        </Typography.Paragraph>
        <Select
          style={{ width: '100%' }}
          placeholder="Select bus"
          value={selectedBusId}
          options={tripBusOptions}
          onChange={(value) => setSelectedBusId(value)}
        />
      </Modal>
    </>
  );
}
