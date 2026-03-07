import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Space, Table, Tabs, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useState, type ReactElement } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PassengerCreateModal from '../../features/passengers/PassengerCreateModal';
import PassengerEditModal from '../../features/passengers/PassengerEditModal';
import ResourceAssignmentModal from '../../features/trips/ResourceAssignmentModal';
import RoundCreateModal from '../../features/trips/RoundCreateModal';
import RoundEditModal from '../../features/trips/RoundEditModal';
import { getBusesApi } from '../../api/busApi';
import { createPassengerApi, deletePassengerApi, getPassengersApi, updatePassengerApi } from '../../api/passengerApi';
import { createRoundApi, deleteRoundApi, getRoundsByTripApi, updateRoundApi } from '../../api/roundApi';
import {
  createTripAssignmentApi,
  deleteTripAssignmentApi,
  getTripAssignmentsApi,
  getTripsApi,
  updateTripAssignmentApi,
} from '../../api/tripApi';
import { userApi } from '../../api/userApi';
import type { UserListItem } from '../../types/user';
import type { Bus, Passenger, Round, Trip, TripAssignment } from '../../types/transport';
import { getErrorMessage } from '../../utils/error';

export default function TripDetail(): ReactElement {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [allBuses, setAllBuses] = useState<Bus[]>([]);
  const [drivers, setDrivers] = useState<UserListItem[]>([]);
  const [assignments, setAssignments] = useState<TripAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [showRoundEditModal, setShowRoundEditModal] = useState(false);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [showPassengerEditModal, setShowPassengerEditModal] = useState(false);
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [submittingRound, setSubmittingRound] = useState(false);
  const [updatingRound, setUpdatingRound] = useState(false);
  const [deletingRoundId, setDeletingRoundId] = useState<string>();
  const [submittingPassenger, setSubmittingPassenger] = useState(false);
  const [updatingPassenger, setUpdatingPassenger] = useState(false);
  const [deletingPassengerId, setDeletingPassengerId] = useState<string>();
  const [submittingAssignment, setSubmittingAssignment] = useState(false);
  const [updatingAssignment, setUpdatingAssignment] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string>();
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<TripAssignment | null>(null);

  const loadTripDetail = useCallback(async (): Promise<void> => {
    if (!tripId) {
      return;
    }

    setLoading(true);
    try {
      const [tripList, roundList, passengerList, assignmentList, busesResponse, usersResponse] = await Promise.all([
        getTripsApi(),
        getRoundsByTripApi(tripId),
        getPassengersApi({ tripId }),
        getTripAssignmentsApi(tripId),
        getBusesApi(),
        userApi.getAll(),
      ]);

      const currentTrip = tripList.find((item) => item.id === tripId) ?? null;
      setTrip(currentTrip);
      setRounds(roundList);
      setPassengers(passengerList);
      setAssignments(assignmentList);
      setAllBuses(busesResponse);
      setDrivers(usersResponse.data.filter((item) => item.role === 'DRIVER'));
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    void loadTripDetail();
  }, [loadTripDetail]);

  const handleCreateRound = async (payload: { name: string; departureTime: string }): Promise<void> => {
    if (!tripId) {
      return;
    }

    setSubmittingRound(true);
    try {
      const created = await createRoundApi({ tripId, ...payload });
      setRounds((prev) =>
        [...prev, created].sort(
          (a, b) => dayjs(a.departureTime).valueOf() - dayjs(b.departureTime).valueOf(),
        ),
      );
      setShowRoundModal(false);
      message.success('Round created successfully.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setSubmittingRound(false);
    }
  };

  const handleCreatePassenger = async (payload: {
    fullName: string;
    phone: string;
    busId?: string;
  }): Promise<void> => {
    if (!tripId) {
      return;
    }

    setSubmittingPassenger(true);
    try {
      const created = await createPassengerApi({ tripId, ...payload });
      setPassengers((prev) => [...prev, created]);
      setShowPassengerModal(false);
      message.success('Passenger created successfully.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setSubmittingPassenger(false);
    }
  };

  const handleCreateAssignment = async (payload: {
    busId: string;
    driverId: string;
  }): Promise<void> => {
    if (!tripId) {
      return;
    }

    setSubmittingAssignment(true);
    try {
      const created = await createTripAssignmentApi(tripId, payload);
      setAssignments((prev) => [...prev, created]);
      setShowResourceModal(false);
      message.success('Resource assigned successfully.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setSubmittingAssignment(false);
    }
  };

  const handleOpenEditAssignment = (assignment: TripAssignment): void => {
    setEditingAssignment(assignment);
    setShowResourceModal(true);
  };

  const handleUpdateAssignment = async (payload: {
    busId: string;
    driverId: string;
  }): Promise<void> => {
    if (!editingAssignment) {
      return;
    }

    setUpdatingAssignment(true);
    try {
      const updated = await updateTripAssignmentApi(editingAssignment.id, payload);
      setAssignments((prev) =>
        prev.map((item) => (item.id === editingAssignment.id ? updated : item)),
      );
      setShowResourceModal(false);
      setEditingAssignment(null);
      message.success('Resource assignment updated.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setUpdatingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (assignment: TripAssignment): Promise<void> => {
    setDeletingAssignmentId(assignment.id);
    try {
      await deleteTripAssignmentApi(assignment.id);
      setAssignments((prev) => prev.filter((item) => item.id !== assignment.id));
      message.success('Resource assignment removed.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setDeletingAssignmentId(undefined);
    }
  };

  const handleOpenEditRound = (round: Round): void => {
    setEditingRound(round);
    setShowRoundEditModal(true);
  };

  const handleUpdateRound = async (payload: {
    name: string;
    departureTime: string;
  }): Promise<void> => {
    if (!editingRound) {
      return;
    }

    setUpdatingRound(true);
    try {
      const updated = await updateRoundApi(editingRound.id, payload);
      setRounds((prev) =>
        prev
          .map((item) => (item.id === editingRound.id ? updated : item))
          .sort((a, b) => dayjs(a.departureTime).valueOf() - dayjs(b.departureTime).valueOf()),
      );
      setShowRoundEditModal(false);
      setEditingRound(null);
      message.success('Round updated successfully.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setUpdatingRound(false);
    }
  };

  const handleDeleteRound = async (round: Round): Promise<void> => {
    setDeletingRoundId(round.id);
    try {
      await deleteRoundApi(round.id);
      setRounds((prev) => prev.filter((item) => item.id !== round.id));
      message.success('Round deleted.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setDeletingRoundId(undefined);
    }
  };

  const handleOpenEditPassenger = (passenger: Passenger): void => {
    setEditingPassenger(passenger);
    setShowPassengerEditModal(true);
  };

  const handleUpdatePassenger = async (payload: {
    fullName: string;
    phone: string;
    email?: string;
    busId?: string;
  }): Promise<void> => {
    if (!editingPassenger) {
      return;
    }

    setUpdatingPassenger(true);
    try {
      const updated = await updatePassengerApi(editingPassenger.id, payload);
      setPassengers((prev) => prev.map((item) => (item.id === editingPassenger.id ? updated : item)));
      setShowPassengerEditModal(false);
      setEditingPassenger(null);
      message.success('Passenger updated successfully.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setUpdatingPassenger(false);
    }
  };

  const handleDeletePassenger = async (passenger: Passenger): Promise<void> => {
    setDeletingPassengerId(passenger.id);
    try {
      await deletePassengerApi(passenger.id);
      setPassengers((prev) => prev.filter((item) => item.id !== passenger.id));
      message.success('Passenger removed.');
    } catch (error: unknown) {
      message.error(getErrorMessage(error));
    } finally {
      setDeletingPassengerId(undefined);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card style={{ boxShadow: '0 1px 4px rgba(0,21,41,.08)' }} bodyStyle={{ padding: 16 }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/trips')}>
              Back
            </Button>
            <div>
              <Typography.Title level={4} style={{ margin: 0, color: '#1f1f1f' }}>
                {trip?.name ?? 'Trip Detail'}
              </Typography.Title>
              <Typography.Text style={{ color: '#595959' }}>
                {trip?.startDate ? dayjs(trip.startDate).format('DD/MM/YYYY HH:mm') : '-'} {'->'}{' '}
                {trip?.endDate ? dayjs(trip.endDate).format('DD/MM/YYYY HH:mm') : '-'}
              </Typography.Text>
            </div>
          </Space>
        </Space>
      </Card>

      <Card style={{ boxShadow: '0 1px 4px rgba(0,21,41,.08)' }} bodyStyle={{ padding: 12 }}>
        <Tabs
          items={[
            {
              key: 'rounds',
              label: 'Rounds',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowRoundModal(true)}>
                      Add Round
                    </Button>
                  </Space>
                  <Table<Round>
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    columns={[
                      { title: 'Name', dataIndex: 'name' },
                      {
                        title: 'Departure Time',
                        dataIndex: 'departureTime',
                        render: (value: string) =>
                          value ? dayjs(value).format('HH:mm DD/MM/YYYY') : '-',
                      },
                      {
                        title: 'Actions',
                        width: 180,
                        render: (_, record) => (
                          <Space>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleOpenEditRound(record)}
                            >
                              Edit
                            </Button>
                            <Popconfirm
                              title="Delete round"
                              description="Are you sure you want to delete this round?"
                              okText="Delete"
                              cancelText="Cancel"
                              onConfirm={() => void handleDeleteRound(record)}
                            >
                              <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={deletingRoundId === record.id}
                              >
                                Delete
                              </Button>
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                    dataSource={rounds}
                  />
                </Space>
              ),
            },
            {
              key: 'resources',
              label: 'Resources & Vehicles',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowResourceModal(true)}
                    >
                      Add Resource
                    </Button>
                  </Space>
                  <Table<TripAssignment>
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    columns={[
                      {
                        title: 'Bus',
                        render: (_, record) =>
                          record.bus?.busCode
                            ? `${record.bus.busCode} (${record.bus.licensePlate})`
                            : (record.bus?.licensePlate ?? '-'),
                      },
                      {
                        title: 'Driver',
                        render: (_, record) => record.driver?.description ?? record.driver?.email ?? '-',
                      },
                      {
                        title: 'Driver Phone',
                        render: (_, record) => record.driver?.phone ?? '-',
                      },
                      {
                        title: 'Actions',
                        width: 180,
                        render: (_, record) => (
                          <Space>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleOpenEditAssignment(record)}
                            >
                              Edit
                            </Button>
                            <Popconfirm
                              title="Delete assignment"
                              description="Remove this resource assignment?"
                              okText="Delete"
                              cancelText="Cancel"
                              onConfirm={() => void handleDeleteAssignment(record)}
                            >
                              <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={deletingAssignmentId === record.id}
                              >
                                Delete
                              </Button>
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                    dataSource={assignments}
                  />
                </Space>
              ),
            },
            {
              key: 'passengers',
              label: 'Passengers',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={12}>
                  <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setShowPassengerModal(true)}
                    >
                      Add Passenger
                    </Button>
                  </Space>
                  <Table<Passenger>
                    rowKey="id"
                    loading={loading}
                    pagination={false}
                    columns={[
                      { title: 'Full Name', dataIndex: 'fullName' },
                      { title: 'Phone', dataIndex: 'phone' },
                      { title: 'Email', dataIndex: 'email', render: (value: string | undefined) => value ?? '-' },
                      { title: 'Bus', render: (_, record) => record.bus?.busCode ?? '-' },
                      {
                        title: 'Actions',
                        width: 180,
                        render: (_, record) => (
                          <Space>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={() => handleOpenEditPassenger(record)}
                            >
                              Edit
                            </Button>
                            <Popconfirm
                              title="Remove passenger"
                              description="Remove this passenger?"
                              okText="Remove"
                              cancelText="Cancel"
                              onConfirm={() => void handleDeletePassenger(record)}
                            >
                              <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                loading={deletingPassengerId === record.id}
                              >
                                Delete
                              </Button>
                            </Popconfirm>
                          </Space>
                        ),
                      },
                    ]}
                    dataSource={passengers}
                  />
                </Space>
              ),
            },
          ]}
        />
      </Card>

      <RoundCreateModal
        open={showRoundModal}
        loading={submittingRound}
        onCancel={() => setShowRoundModal(false)}
        onSubmit={handleCreateRound}
      />

      <RoundEditModal
        open={showRoundEditModal}
        loading={updatingRound}
        round={editingRound}
        onCancel={() => {
          setShowRoundEditModal(false);
          setEditingRound(null);
        }}
        onSubmit={handleUpdateRound}
      />

      <PassengerCreateModal
        open={showPassengerModal}
        loading={submittingPassenger}
        busOptions={assignments.map((assignment) => ({
          value: assignment.busId,
          label:
            assignment.bus?.busCode
              ? `${assignment.bus.busCode} (${assignment.bus.licensePlate}) - Driver: ${assignment.driver?.description ?? assignment.driver?.email ?? '-'}`
              : `${assignment.bus?.licensePlate ?? '-'} - Driver: ${assignment.driver?.description ?? assignment.driver?.email ?? '-'}`,
        }))}
        onCancel={() => setShowPassengerModal(false)}
        onSubmit={handleCreatePassenger}
      />

      <PassengerEditModal
        open={showPassengerEditModal}
        loading={updatingPassenger}
        passenger={editingPassenger}
        busOptions={assignments.map((assignment) => ({
          value: assignment.busId,
          label:
            assignment.bus?.busCode
              ? `${assignment.bus.busCode} (${assignment.bus.licensePlate})`
              : `${assignment.bus?.licensePlate ?? '-'}`,
        }))}
        onCancel={() => {
          setShowPassengerEditModal(false);
          setEditingPassenger(null);
        }}
        onSubmit={handleUpdatePassenger}
      />

      <ResourceAssignmentModal
        open={showResourceModal}
        loading={submittingAssignment || updatingAssignment}
        title={editingAssignment ? 'Edit Resource Assignment' : 'Assign Resource'}
        buses={allBuses}
        drivers={drivers}
        initialValues={{
          busId: editingAssignment?.busId,
          driverId: editingAssignment?.driverId,
        }}
        onCancel={() => {
          setShowResourceModal(false);
          setEditingAssignment(null);
        }}
        onSubmit={editingAssignment ? handleUpdateAssignment : handleCreateAssignment}
      />
    </Space>
  );
}
