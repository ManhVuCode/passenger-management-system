import { Card, Space, Typography } from 'antd';
import type { ReactElement } from 'react';
import AttendanceDenseTable from '../../features/attendance/AttendanceDenseTable';
import AttendanceFilterBar from '../../features/attendance/AttendanceFilterBar';
import { useAttendanceWorkspace } from '../../hooks/useAttendanceWorkspace';

export default function AttendancePage(): ReactElement {
  const {
    filters,
    trips,
    roundSlots,
    busOptions,
    tripBusOptions,
    rows,
    isLoading,
    savingKeys,
    onTripChange,
    onDateChange,
    onBusChange,
    onStatusChange,
    onKeywordChange,
    onChangePassengerBus,
    onToggleRound,
    onNoteChange,
    onSaveNote,
  } = useAttendanceWorkspace();

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card
        bordered={false}
        bodyStyle={{ padding: 14, background: 'linear-gradient(90deg, #0d2747 0%, #173c68 100%)' }}
      >
        <Typography.Title level={4} style={{ margin: 0, color: '#fff' }}>
          Transportation Attendance Control
        </Typography.Title>
        <Typography.Text style={{ color: 'rgba(255,255,255,0.8)' }}>
          High-density table for outbound/inbound attendance with inline notes.
        </Typography.Text>
      </Card>

      <AttendanceFilterBar
        tripId={filters.tripId}
        trips={trips}
        date={filters.date}
        busOptions={busOptions}
        selectedBusIds={filters.busIds}
        status={filters.status}
        keyword={filters.keyword}
        onTripChange={onTripChange}
        onDateChange={onDateChange}
        onBusChange={onBusChange}
        onStatusChange={onStatusChange}
        onKeywordChange={onKeywordChange}
      />

      <AttendanceDenseTable
        rows={rows}
        roundSlots={roundSlots}
        loading={isLoading}
        savingKeys={savingKeys}
        tripBusOptions={tripBusOptions}
        onChangePassengerBus={onChangePassengerBus}
        onToggleRound={onToggleRound}
        onNoteChange={onNoteChange}
        onSaveNote={onSaveNote}
      />
    </Space>
  );
}
