export const en = {
  nav: {
    signOut: 'Sign Out',
    language: 'Language',
  },

  common: {
    loading: 'Loading…',
    back: 'Back',
    search: 'Search',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    gotIt: 'Got it',
  },

  status: {
    PLANNED: 'Planned',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
    CANCELLED: 'Cancelled',
    JOIN: 'Joined',
    ABSENT: 'Absent',
    PENDING: 'Pending',
  },

  auth: {
    signIn: 'Sign In',
    redirectingToLogin: 'Redirecting to sign-in…',
    signingIn: 'Signing in…',
    email: 'Email',
    password: 'Password',
    busManagerPortal: 'BusManager Portal',
    invalidCredentials: 'Invalid email or password',
    connectionError: 'Connection error. Is the API running?',
    backToOfficial: 'Back online? Return to the main site',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm New Password',
    updatePassword: 'Update Password',
    passwordChanged: '✓ Password changed',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    failedChangePassword: 'Failed to change password',
  },

  home: {
    title: 'My Rounds',
    assignment_one: '{{count}} assignment today',
    assignment_other: '{{count}} assignments today',
    noRounds: 'No rounds assigned yet.',
    loadingAssignments: 'Loading assignments…',
    offline: 'Offline — showing cached data',
    emptyTitle: 'No rounds yet',
    emptyBody: 'Contact your Admin to be assigned',
    tapToCheckin: 'Tap to check in',
    adminTitle: 'Attendance',
    driverSub: 'Your assigned rounds',
    adminSub: 'Mark attendance by round',
    selectTrip: 'Select a trip',
    noTrips: 'No trips yet',
    noPassengers: 'No passengers on this bus.',
    passengers: 'Passengers ({{count}})',
    pending: 'Pending',
  },

  attendance: {
    title: 'Attendance',
    seats_one: 'Bus · {{count}} passenger',
    seats_other: 'Bus · {{count}} passengers',
    joined: '✓ {{count}} Joined',
    absent: '✗ {{count}} Absent',
    pending: '? {{count}} Pending',
    markAllJoin: 'Mark All Present',
    markAllAbsent: 'Mark All Absent',
    completeRound: 'Complete Round → DONE',
    completing: 'Completing…',
    confirmCompleteTitle: 'Complete this round?',
    confirmCompleteBody:
      'This round will be marked as DONE. All unmarked passengers will remain pending.',
    confirmCompleteButton: 'Complete Round',
    failedComplete: 'Failed to complete round',
    failedMark: 'Could not save attendance',
    noPassengers: 'No passengers allocated to this bus.',
    offline: 'Offline — marks queued, will sync on reconnect',
    broadcastAlert: 'Broadcast Alert',
    peerUpdate: 'Bus {{bus}}: {{name}} → {{status}} · {{time}}',
    loadingPassengers: 'Loading passengers…',
    noteLabel: '▼ Note: {{note}}',
  },

  profile: {
    driver: 'Driver',
    appFooter: 'MPMS · v1.0 · BusManager App',
  },

  errors: {
    serverError: 'Server error. Please try again.',
    connectionError: 'Connection error. Is the API running?',
  },
}

export type PWATranslationKeys = typeof en
