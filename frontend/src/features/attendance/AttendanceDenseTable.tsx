import { Col, Empty, Row, Typography } from 'antd';
import type { ReactElement } from 'react';
import type { AttendanceRow, RoundSlot } from './attendance.types';
import AttendanceRoundTable from './AttendanceRoundTable';

interface AttendanceDenseTableProps {
  rows: AttendanceRow[];
  roundSlots: RoundSlot[];
  loading: boolean;
  savingKeys: string[];
  tripBusOptions: Array<{ value: string; label: string }>;
  onChangePassengerBus: (row: AttendanceRow, busId: string) => Promise<void>;
  onToggleRound: (row: AttendanceRow, roundId: string, checked: boolean) => Promise<void>;
  onNoteChange: (passengerId: string, roundId: string, value: string) => void;
  onSaveNote: (row: AttendanceRow, roundId: string) => Promise<void>;
}

export default function AttendanceDenseTable({
  rows,
  roundSlots,
  loading,
  savingKeys,
  tripBusOptions,
  onChangePassengerBus,
  onToggleRound,
  onNoteChange,
  onSaveNote,
}: AttendanceDenseTableProps): ReactElement {
  if (!roundSlots.length) {
    return <Empty description="No rounds available for this trip." />;
  }

  return (
    <Row gutter={[0, 0]}>
      {roundSlots.map((slot) => (
        <Col key={slot.id} span={24} style={{ marginBottom: 24 }}>
          <div
            style={{
              border: '1px solid #f0f0f0',
              borderRadius: 8,
              padding: 16,
              background: '#fff',
            }}
          >
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              {slot.name}
            </Typography.Title>
            <AttendanceRoundTable
              roundTitle="Present"
              roundId={slot.id}
              rows={rows}
              loading={loading}
              savingKeys={savingKeys}
              tripBusOptions={tripBusOptions}
              onChangePassengerBus={onChangePassengerBus}
              onToggleRound={onToggleRound}
              onNoteChange={onNoteChange}
              onSaveNote={onSaveNote}
            />
          </div>
        </Col>
      ))}
    </Row>
  );
}
