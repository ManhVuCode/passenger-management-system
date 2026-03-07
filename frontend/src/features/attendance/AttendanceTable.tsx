import React, { useState } from 'react';
import { Table, Checkbox, Input, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Passenger, AttendanceRecord } from '../../types/transport';
import { attendanceApi } from '../../api/attendanceApi';

interface Props {
  passengers: Passenger[];
  currentRoundId: string;
  attendanceData: AttendanceRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export const AttendanceTable: React.FC<Props> = ({ 
  passengers, 
  currentRoundId, 
  attendanceData,
  loading,
  onRefresh 
}) => {
  // State lưu note tạm thời khi đang gõ
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleCheckIn = async (passengerId: string, checked: boolean) => {
    try {
      // Tìm note hiện tại trong DB hoặc note đang gõ
      const currentRecord = attendanceData.find(r => r.passengerId === passengerId);
      const noteToSend = notes[passengerId] !== undefined ? notes[passengerId] : (currentRecord?.note || '');

      await attendanceApi.checkIn({
        roundId: currentRoundId,
        passengerId,
        isPresent: checked,
        note: noteToSend
      });
      message.success('Đã lưu!');
      onRefresh();
    } catch {
      message.error('Lỗi lưu điểm danh');
    }
  };

  const handleSaveNote = async (passengerId: string, value: string) => {
    const currentRecord = attendanceData.find(r => r.passengerId === passengerId);
    try {
      await attendanceApi.checkIn({
        roundId: currentRoundId,
        passengerId,
        isPresent: currentRecord?.isPresent || false,
        note: value
      });
      message.success('Đã lưu ghi chú');
      onRefresh();
    } catch {
      message.error('Lỗi lưu ghi chú');
    }
  };

  const columns: ColumnsType<Passenger> = [
    {
      title: 'STT',
      key: 'index',
      width: 60,
      align: 'center',
      render: (_, __, index) => <b>{index + 1}</b>,
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      width: 200,
      render: (text) => <span style={{ fontWeight: 500 }}>{text}</span>,
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      width: 120,
    },
    {
      title: 'Có mặt',
      key: 'attendance',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const status = attendanceData.find(a => a.passengerId === record.id);
        return (
          <Checkbox 
            checked={status?.isPresent || false}
            onChange={(e) => handleCheckIn(record.id, e.target.checked)}
          />
        );
      }
    },
    {
      title: 'Ghi chú',
      key: 'note',
      render: (_, record) => {
        const status = attendanceData.find(a => a.passengerId === record.id);
        // Ưu tiên hiển thị cái đang gõ (trong state), nếu không thì lấy từ DB
        const displayValue = notes[record.id] !== undefined ? notes[record.id] : (status?.note || '');
        
        return (
          <Input 
            placeholder="..." 
            value={displayValue}
            onChange={(e) => setNotes(prev => ({ ...prev, [record.id]: e.target.value }))}
            onBlur={(e) => handleSaveNote(record.id, e.target.value)}
            bordered={false}
            style={{ background: displayValue ? '#fff7e6' : 'transparent' }}
          />
        );
      }
    }
  ];

  return (
    <Table 
      dataSource={passengers} 
      columns={columns} 
      rowKey="id"
      size="small"
      bordered
      pagination={false}
      loading={loading}
      scroll={{ y: 500 }}
    />
  );
};
