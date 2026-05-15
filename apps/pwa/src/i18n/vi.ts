import type { PWATranslationKeys } from './en'

export const vi: PWATranslationKeys = {
  nav: {
    signOut: 'Đăng xuất',
    language: 'Ngôn ngữ',
  },

  common: {
    loading: 'Đang tải…',
    back: 'Quay lại',
    search: 'Tìm kiếm',
    cancel: 'Hủy',
    save: 'Lưu',
    close: 'Đóng',
    gotIt: 'Đã hiểu',
  },

  status: {
    PLANNED: 'Kế hoạch',
    IN_PROGRESS: 'Đang thực hiện',
    DONE: 'Hoàn thành',
    CANCELLED: 'Đã hủy',
    JOIN: 'Đã lên xe',
    ABSENT: 'Vắng mặt',
    PENDING: 'Chờ điểm danh',
  },

  auth: {
    signIn: 'Đăng nhập',
    signingIn: 'Đang đăng nhập…',
    email: 'Email',
    password: 'Mật khẩu',
    busManagerPortal: 'Cổng tài xế',
    invalidCredentials: 'Email hoặc mật khẩu không đúng',
    connectionError: 'Lỗi kết nối. Kiểm tra API server.',
    changePassword: 'Đổi mật khẩu',
    currentPassword: 'Mật khẩu hiện tại',
    newPassword: 'Mật khẩu mới',
    confirmPassword: 'Xác nhận mật khẩu mới',
    updatePassword: 'Cập nhật mật khẩu',
    passwordChanged: '✓ Đổi mật khẩu thành công',
    passwordMismatch: 'Mật khẩu không khớp',
    passwordTooShort: 'Mật khẩu phải có ít nhất 6 ký tự',
    failedChangePassword: 'Đổi mật khẩu thất bại',
  },

  home: {
    title: 'Chặng của tôi',
    assignment_one: '{{count}} phân công hôm nay',
    assignment_other: '{{count}} phân công hôm nay',
    noRounds: 'Chưa có chặng nào được phân công.',
    loadingAssignments: 'Đang tải phân công…',
    offline: 'Ngoại tuyến — đang dùng dữ liệu lưu',
  },

  attendance: {
    title: 'Điểm danh',
    seats_one: 'Xe · {{count}} chỗ',
    seats_other: 'Xe · {{count}} chỗ',
    joined: '✓ {{count}} Đã lên',
    absent: '✗ {{count}} Vắng',
    pending: '? {{count}} Chờ',
    markAllJoin: 'Điểm danh tất cả',
    markAllAbsent: 'Vắng tất cả',
    completeRound: 'Hoàn thành chặng → DONE',
    completing: 'Đang hoàn thành…',
    confirmCompleteTitle: 'Hoàn thành chặng này?',
    confirmCompleteBody:
      'Chặng này sẽ được đánh dấu DONE. Các hành khách chưa điểm danh sẽ vẫn ở trạng thái chờ.',
    confirmCompleteButton: 'Hoàn thành chặng',
    failedComplete: 'Hoàn thành chặng thất bại',
    noPassengers: 'Chưa có hành khách trên xe này.',
    offline: 'Ngoại tuyến — điểm danh đã lưu, sẽ gửi khi có mạng',
    broadcastAlert: 'Thông báo khẩn',
    peerUpdate: 'Xe {{bus}}: {{name}} → {{status}} · {{time}}',
    loadingPassengers: 'Đang tải hành khách…',
    noteLabel: '▼ Ghi chú: {{note}}',
  },

  profile: {
    driver: 'Tài xế',
    appFooter: 'MPMS · v1.0 · Ứng dụng tài xế',
  },

  errors: {
    serverError: 'Lỗi server. Vui lòng thử lại.',
    connectionError: 'Lỗi kết nối. Kiểm tra API server.',
  },
}
