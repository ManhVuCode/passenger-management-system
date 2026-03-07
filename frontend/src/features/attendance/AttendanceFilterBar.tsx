import { CalendarOutlined, FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { Card, Checkbox, Col, DatePicker, Input, Radio, Row, Select, Space, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import type { ReactElement } from 'react';
import type { AttendanceStatusFilter } from './attendance.types';
import type { Trip } from '../../types/transport';

interface BusOption {
  value: string;
  label: string;
}

interface AttendanceFilterBarProps {
  tripId: string | null;
  trips: Trip[];
  date: Dayjs | null;
  busOptions: BusOption[];
  selectedBusIds: string[];
  status: AttendanceStatusFilter;
  keyword: string;
  onTripChange: (tripId: string) => void;
  onDateChange: (date: Dayjs | null) => void;
  onBusChange: (busIds: string[]) => void;
  onStatusChange: (status: AttendanceStatusFilter) => void;
  onKeywordChange: (value: string) => void;
}

export default function AttendanceFilterBar({
  tripId,
  trips,
  date,
  busOptions,
  selectedBusIds,
  status,
  keyword,
  onTripChange,
  onDateChange,
  onBusChange,
  onStatusChange,
  onKeywordChange,
}: AttendanceFilterBarProps): ReactElement {
  return (
    <Card style={{ borderRadius: 14, borderColor: '#cfd8e3' }} bodyStyle={{ padding: 14 }}>
      <Space align="center" size={8} style={{ marginBottom: 12 }}>
        <FilterOutlined style={{ color: '#1d3557' }} />
        <Typography.Text strong style={{ color: '#1d3557' }}>
          Attendance Filters
        </Typography.Text>
      </Space>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8} lg={5}>
          <Typography.Text type="secondary">Trip</Typography.Text>
          <Select
            value={tripId ?? undefined}
            onChange={onTripChange}
            options={trips.map((trip) => ({ value: trip.id, label: trip.name }))}
            style={{ width: '100%', marginTop: 4 }}
            placeholder="Select trip"
          />
        </Col>

        <Col xs={24} md={8} lg={5}>
          <Typography.Text type="secondary">Date</Typography.Text>
          <DatePicker
            value={date}
            onChange={onDateChange}
            style={{ width: '100%', marginTop: 4 }}
            placeholder="Filter date"
            suffixIcon={<CalendarOutlined />}
          />
        </Col>

        <Col xs={24} md={8} lg={7}>
          <Typography.Text type="secondary">Status</Typography.Text>
          <Radio.Group
            value={status}
            onChange={(event) => onStatusChange(event.target.value as AttendanceStatusFilter)}
            style={{ display: 'flex', marginTop: 4 }}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="all">All</Radio.Button>
            <Radio.Button value="present">Present</Radio.Button>
            <Radio.Button value="absent">Absent</Radio.Button>
          </Radio.Group>
        </Col>

        <Col xs={24} lg={7}>
          <Typography.Text type="secondary">Passenger Search</Typography.Text>
          <Input
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="Search by passenger name"
            prefix={<SearchOutlined />}
            style={{ marginTop: 4 }}
            allowClear
          />
        </Col>

        <Col span={24}>
          <Typography.Text type="secondary">Bus Filter</Typography.Text>
          <Checkbox.Group
            options={busOptions}
            value={selectedBusIds}
            onChange={(values) => onBusChange(values as string[])}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}
          />
        </Col>
      </Row>
    </Card>
  );
}
