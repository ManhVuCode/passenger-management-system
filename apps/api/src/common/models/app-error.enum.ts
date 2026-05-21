export enum AppErrorCode {
  SYSTEM_ERROR        = 'SYS_001',
  NOT_FOUND           = 'SYS_002',
  UNAUTHORIZED        = 'SYS_003',
  FORBIDDEN           = 'SYS_004',
  VALIDATION_ERROR    = 'SYS_005',

  INVALID_CREDENTIALS = 'AUTH_001',
  TENANT_SUSPENDED    = 'AUTH_002',
  TOKEN_EXPIRED       = 'AUTH_003',
  WRONG_PASSWORD      = 'AUTH_004',

  TRIP_NOT_FOUND      = 'TRIP_001',
  TRIP_NAME_INVALID   = 'TRIP_002',

  ROUND_NOT_FOUND        = 'ROUND_001',
  ROUND_STATUS_INVALID   = 'ROUND_002',
  ROUND_CANCEL_FORBIDDEN = 'ROUND_003',

  BUS_NOT_FOUND       = 'BUS_001',
  BUS_PLATE_DUPLICATE = 'BUS_002',

  PASSENGER_NOT_FOUND     = 'PAX_001',
  PASSENGER_PHONE_INVALID = 'PAX_002',

  ALLOCATION_NOT_FOUND    = 'ALLOC_001',
  ALLOCATION_DUPLICATE    = 'ALLOC_002',
  ALLOCATION_MOVE_INVALID = 'ALLOC_003',
  BUS_CAPACITY_EXCEEDED   = 'ALLOC_004',

  ATTENDANCE_NOT_FOUND    = 'ATT_001',
  ATTENDANCE_SCOPE_DENIED = 'ATT_002',
}

export const AppErrorMessage: Record<AppErrorCode, string> = {
  [AppErrorCode.SYSTEM_ERROR]:        'System error. Please try again.',
  [AppErrorCode.NOT_FOUND]:           'Resource not found.',
  [AppErrorCode.UNAUTHORIZED]:        'Unauthorized.',
  [AppErrorCode.FORBIDDEN]:           'Access denied.',
  [AppErrorCode.VALIDATION_ERROR]:    'Validation failed.',

  [AppErrorCode.INVALID_CREDENTIALS]: 'Invalid email or password.',
  [AppErrorCode.TENANT_SUSPENDED]:    'Tenant account is suspended.',
  [AppErrorCode.TOKEN_EXPIRED]:       'Session expired. Please log in again.',
  [AppErrorCode.WRONG_PASSWORD]:      'Current password is incorrect.',

  [AppErrorCode.TRIP_NOT_FOUND]:      'Trip not found.',
  [AppErrorCode.TRIP_NAME_INVALID]:   'Trip name must not contain "/".',

  [AppErrorCode.ROUND_NOT_FOUND]:        'Round not found.',
  [AppErrorCode.ROUND_STATUS_INVALID]:   'Invalid round status transition.',
  [AppErrorCode.ROUND_CANCEL_FORBIDDEN]: 'BusManager cannot cancel a round.',

  [AppErrorCode.BUS_NOT_FOUND]:       'Bus not found.',
  [AppErrorCode.BUS_PLATE_DUPLICATE]: 'License plate already registered.',

  [AppErrorCode.PASSENGER_NOT_FOUND]:     'Passenger not found.',
  [AppErrorCode.PASSENGER_PHONE_INVALID]: 'Phone number must be exactly 10 digits.',

  [AppErrorCode.ALLOCATION_NOT_FOUND]:    'Allocation not found.',
  [AppErrorCode.ALLOCATION_DUPLICATE]:    'Passenger already allocated to a bus in this round.',
  [AppErrorCode.ALLOCATION_MOVE_INVALID]: 'Cannot move passenger — round is not in PLANNED status.',
  [AppErrorCode.BUS_CAPACITY_EXCEEDED]:   'Bus capacity exceeded.',

  [AppErrorCode.ATTENDANCE_NOT_FOUND]:    'Attendance record not found.',
  [AppErrorCode.ATTENDANCE_SCOPE_DENIED]: 'BusManager can only mark attendance for their assigned bus.',
}
