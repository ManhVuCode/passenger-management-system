import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  type UserItem,
} from './usersApi'
import { useAppSelector } from '../../store/hooks'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { Input } from '../../components/ui/input'
import { Skeleton } from '../../components/ui/skeleton'
import { MetricCard } from '../../components/ui/metric-card'
import { PageHeader } from '../../components/ui/page-header'
import { EmptyState } from '../../components/ui/empty-state'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
import { SectionCard } from '../../components/ui/section-card'
import { DataTable, type Column } from '../../components/ui/data-table'
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  Shield,
  Bus as BusIcon,
  Search,
  X,
  Eye,
  EyeOff,
  Info,
  Check,
  Loader2,
  UserPlus,
  UserCog,
} from 'lucide-react'
import { cn } from '../../lib/utils'

export default function UserManagementPage() {
  const { t } = useTranslation()
  const { data: users = [], isLoading } = useGetUsersQuery()
  const [createUser] = useCreateUserMutation()
  const [updateUser] = useUpdateUserMutation()
  const [deleteUser] = useDeleteUserMutation()
  const currentUserId = useAppSelector((s) => s.auth.userId)

  const [search, setSearch] = useState('')
  const [isPanelOpen, setIsPanelOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserItem | null>(null)
  const [deletingUser, setDeletingUser] = useState<UserItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  const adminCount = users.filter((u) => u.role === 'ADMIN').length
  const driverCount = users.filter((u) => u.role === 'BUS_MANAGER').length

  function openCreate() {
    setEditingUser(null)
    setIsPanelOpen(true)
  }

  function openEdit(user: UserItem) {
    setEditingUser(user)
    setIsPanelOpen(true)
  }

  async function handleDeleteUser() {
    if (!deletingUser) return
    setDeleteError('')
    setDeleting(true)
    try {
      await deleteUser(deletingUser.id).unwrap()
      setDeletingUser(null)
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setDeleteError(typeof msg === 'string' ? msg : t('users.submitFailed'))
    } finally {
      setDeleting(false)
    }
  }

  const columns: Column<UserItem>[] = [
    {
      key: 'name',
      header: t('users.colName'),
      sortValue: (u) => u.name,
      render: (u) => {
        const isSelf = u.id === currentUserId
        return (
          <div className="flex items-center gap-3">
            {/* Avatar chữ cái đầu — tông màu theo vai trò, đồng bộ với Badge */}
            <div
              className={cn(
                'grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold shadow-inner-highlight',
                u.role === 'ADMIN'
                  ? 'bg-gradient-to-br from-primary-50 to-primary-100 text-primary-700 ring-1 ring-primary-200/70'
                  : 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 ring-1 ring-orange-200/70',
              )}
            >
              {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="font-semibold text-navy-900">{u.name}</span>
            {isSelf && (
              <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary-600 ring-1 ring-primary-200/60">
                {t('users.you')}
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'email',
      header: t('users.colEmail'),
      sortValue: (u) => u.email,
      render: (u) => <span className="text-gray-600">{u.email}</span>,
    },
    {
      key: 'phone',
      header: t('users.colPhone'),
      render: (u) => (
        <span className="text-gray-600 tabular-nums">{u.phone ?? '—'}</span>
      ),
    },
    {
      key: 'role',
      header: t('users.colRole'),
      sortValue: (u) => u.role,
      render: (u) => (
        <Badge
          variant={u.role === 'ADMIN' ? 'ADMIN' : 'BUS_MANAGER'}
          label={u.role === 'ADMIN' ? t('users.roleAdmin') : t('users.roleDriver')}
        />
      ),
    },
    {
      key: 'joined',
      header: t('users.colJoined'),
      sortValue: (u) => new Date(u.createdAt).getTime(),
      render: (u) => (
        <span className="text-gray-500 tabular-nums">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => {
        const isSelf = u.id === currentUserId
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => openEdit(u)}
              className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-gray-400 transition-[color,background-color,transform] duration-150 hover:bg-primary-50 hover:text-primary-600 active:scale-90"
              aria-label={t('common.edit')}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => !isSelf && setDeletingUser(u)}
              disabled={isSelf}
              title={isSelf ? t('users.cannotDeleteSelf') : undefined}
              className={cn(
                'grid h-8 w-8 place-items-center rounded-lg transition-[color,background-color,transform] duration-150',
                isSelf
                  ? 'cursor-not-allowed text-gray-200'
                  : 'cursor-pointer text-gray-400 hover:bg-danger-50 hover:text-danger-600 active:scale-90',
              )}
              aria-label={t('common.delete')}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      },
    },
  ]

  // Khung xương shimmer trong lúc tải — giữ đúng bố cục trang để tránh giật layout
  if (isLoading) {
    return (
      <div className="p-8">
        <span role="status" className="sr-only">{t('common.loading')}</span>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="space-y-2.5">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-12 w-40 rounded-xl" />
        </div>
        <div className="mb-8 grid grid-cols-3 gap-6">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <SectionCard bodyClassName="p-0">
          <div className="border-b border-border bg-gradient-to-r from-gray-50/80 to-transparent px-4 py-3">
            <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          </div>
          <DataTable
            columns={columns}
            data={[]}
            rowKey={(u) => u.id}
            loading
            className="rounded-none border-0 shadow-none"
          />
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Tiêu đề trang */}
      <PageHeader
        className="mb-8"
        title={t('users.title')}
        subtitle={t('users.subtitle', { count: users.length })}
        actions={
          <Button className="gap-2 shadow-glow" size="lg" onClick={openCreate}>
            <Plus size={18} /> {t('users.addUser')}
          </Button>
        }
      />

      {/* Thống kê */}
      <div className="mb-8 grid grid-cols-3 gap-6">
        <MetricCard
          label={t('users.totalUsers')}
          value={users.length}
          icon={Users}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <MetricCard
          label={t('users.admins')}
          value={adminCount}
          icon={Shield}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <MetricCard
          label={t('users.drivers')}
          value={driverCount}
          icon={BusIcon}
          color="text-[#c2410c]"
          bg="bg-[#fff7ed]"
        />
      </div>

      {/* Khối danh bạ — thanh công cụ tìm kiếm gắn liền với bảng trong cùng một thẻ */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
      >
        <SectionCard bodyClassName="p-0">
          <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-gray-50/80 to-transparent px-4 py-3">
            {/* Ô tìm kiếm — icon đổi sang tông primary khi focus (peer) */}
            <div className="relative w-full max-w-md">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('users.searchPlaceholder')}
                aria-label={t('common.search')}
                className="peer h-10 bg-white pl-10 pr-4"
              />
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors duration-150 peer-focus:text-primary-500"
              />
            </div>

            {/* Chip đếm kết quả khớp — chỉ hiện khi đang tìm kiếm */}
            <AnimatePresence>
              {search && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-primary-700 ring-1 ring-primary-200/60"
                >
                  {filtered.length}
                  <span className="text-primary-300">/</span>
                  <span className="text-primary-500">{users.length}</span>
                </motion.span>
              )}
            </AnimatePresence>

            {/* Chú giải vai trò với số lượng trực tiếp — ẩn trên màn hình hẹp */}
            <div className="ml-auto hidden shrink-0 items-center gap-4 md:flex">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <span aria-hidden className="h-2 w-2 rounded-full bg-primary-500" />
                <span className="font-bold tabular-nums text-navy-900">{adminCount}</span>
                {t('users.roleAdmin')}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                <span aria-hidden className="h-2 w-2 rounded-full bg-orange-500" />
                <span className="font-bold tabular-nums text-navy-900">{driverCount}</span>
                {t('users.roleDriver')}
              </span>
            </div>
          </div>

          {/* Bảng — bỏ viền/bo góc riêng vì đã nằm gọn trong SectionCard */}
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(u) => u.id}
            className="rounded-none border-0 shadow-none"
            empty={
              <EmptyState
                icon={Users}
                title={users.length === 0 ? t('users.noUsers') : t('users.noResults')}
                action={
                  users.length === 0 ? (
                    <Button size="sm" className="gap-1.5" onClick={openCreate}>
                      <Plus size={14} /> {t('users.addUser')}
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </SectionCard>
      </motion.div>

      {/* Panel nổi trượt vào để tạo/sửa — tách khỏi mép màn hình kiểu Linear */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 z-[60] bg-navy-950/45 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '115%' }}
              animate={{ x: 0 }}
              exit={{ x: '115%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 38 }}
              role="dialog"
              aria-modal="true"
              aria-label={editingUser ? t('users.editTitle') : t('users.createTitle')}
              className="fixed top-3 right-3 bottom-3 z-[70] flex w-full max-w-[480px] flex-col overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-black/5"
            >
              {/* Sợi gradient nhấn trên cùng panel */}
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 z-10 h-1 bg-gradient-to-r from-primary-600 via-sky-400 to-cyan-400"
              />

              {/* Đầu panel — dải gradient nhẹ + ô icon phát sáng theo ngữ cảnh tạo/sửa */}
              <div className="relative flex items-start justify-between gap-4 overflow-hidden border-b border-gray-100 bg-gradient-to-br from-primary-50/80 via-white to-white p-6">
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary-200/30 blur-3xl"
                />
                <div className="relative flex items-center gap-3.5">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-glow">
                    {editingUser ? <UserCog size={20} /> : <UserPlus size={20} />}
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-bold tracking-tight text-navy-900">
                      {editingUser ? t('users.editTitle') : t('users.createTitle')}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {editingUser ? t('users.editSubtitle') : t('users.createSubtitle')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-full text-gray-400 transition-colors duration-150 hover:bg-navy-900/5 hover:text-navy-900"
                  aria-label={t('common.close')}
                >
                  <X size={18} />
                </button>
              </div>

              <UserForm
                user={editingUser}
                onSubmit={async (data) => {
                  if (editingUser) {
                    await updateUser({ id: editingUser.id, ...data }).unwrap()
                  } else {
                    await createUser(data as never).unwrap()
                  }
                  setIsPanelOpen(false)
                }}
                onCancel={() => setIsPanelOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Xác nhận xóa */}
      <ConfirmDialog
        open={!!deletingUser}
        title={t('users.deleteTitle')}
        description={
          deletingUser ? (
            <>
              <span className="font-semibold">{deletingUser.name}</span> ({deletingUser.email}){' '}
              {t('users.deleteConfirm')}
            </>
          ) : null
        }
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        error={deleteError || null}
        onConfirm={handleDeleteUser}
        onCancel={() => {
          setDeletingUser(null)
          setDeleteError('')
        }}
      />
    </div>
  )
}

// ── Form người dùng ────────────────────────────────────────────────

/** Nhịp xuất hiện lần lượt cho từng khối trường trong panel (tối đa 0.4s). */
function fieldMotion(i: number) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: 'easeOut' as const, delay: 0.08 + Math.min(i * 0.04, 0.4) },
  }
}

function UserForm({
  user,
  onSubmit,
  onCancel,
}: {
  user: UserItem | null
  onSubmit: (data: {
    name: string
    email: string
    phone?: string
    role: 'ADMIN' | 'BUS_MANAGER'
    password?: string
  }) => Promise<void>
  onCancel: () => void
}) {
  const { t } = useTranslation()
  const isEdit = !!user
  const [form, setForm] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    role: (user?.role === 'ADMIN' ? 'ADMIN' : 'BUS_MANAGER') as 'ADMIN' | 'BUS_MANAGER',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const labelClass = 'text-[11px] font-bold text-gray-500 uppercase tracking-[0.14em] ml-1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setError(t('users.phoneError'))
      return
    }
    setSubmitting(true)
    try {
      const payload = isEdit
        ? {
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            role: form.role,
          }
        : {
            name: form.name,
            email: form.email,
            phone: form.phone || undefined,
            role: form.role,
            password: form.password,
          }
      await onSubmit(payload)
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setError(typeof msg === 'string' ? msg : t('users.submitFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  const RoleIcon = form.role === 'ADMIN' ? Shield : BusIcon

  // Hai lựa chọn vai trò — giá trị giữ nguyên 'ADMIN' | 'BUS_MANAGER'
  const roleOptions = [
    { value: 'ADMIN' as const, label: t('users.roleAdminFull'), icon: Shield },
    { value: 'BUS_MANAGER' as const, label: t('users.roleDriverFull'), icon: BusIcon },
  ]

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <motion.div {...fieldMotion(0)} className="space-y-1.5">
          <label className={labelClass}>{t('users.fullName')} *</label>
          <Input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('users.fullNamePlaceholder')}
            className="h-11 px-4 font-medium"
          />
        </motion.div>

        <motion.div {...fieldMotion(1)} className="space-y-1.5">
          <label className={labelClass}>{t('users.email')} *</label>
          <Input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="user@company.com"
            className="h-11 px-4 font-medium"
          />
        </motion.div>

        <motion.div {...fieldMotion(2)} className="space-y-1.5">
          <label className={labelClass}>{t('users.phone')}</label>
          <Input
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })
            }
            maxLength={10}
            placeholder="0901234567"
            className="h-11 px-4 font-medium tabular-nums"
          />
          <div className="flex justify-between">
            <span className="text-[10px] text-gray-500">{t('users.phoneHint')}</span>
            <span
              className={cn(
                'text-[10px] font-semibold tabular-nums',
                form.phone.length === 10
                  ? 'text-success-600'
                  : form.phone.length > 0
                    ? 'text-warning-600'
                    : 'text-gray-500',
              )}
            >
              {form.phone.length}/10
            </span>
          </div>
        </motion.div>

        <motion.div {...fieldMotion(3)} className="space-y-1.5">
          <label className={labelClass}>{t('users.role')} *</label>
          {/* Bộ chọn vai trò dạng thẻ — dấu check bật vào bằng spring khi chọn */}
          <div className="grid grid-cols-2 gap-2.5">
            {roleOptions.map((opt) => {
              const selected = form.role === opt.value
              const OptIcon = opt.icon
              return (
                <button
                  key={opt.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setForm({ ...form, role: opt.value })}
                  className={cn(
                    'relative flex cursor-pointer items-center gap-2.5 rounded-xl border p-3 text-left',
                    'transition-[border-color,background-color,box-shadow] duration-200',
                    selected
                      ? 'border-primary-400 bg-primary-50/70 shadow-[0_0_0_3px_rgba(14,165,233,0.12)]'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                  )}
                >
                  <span
                    className={cn(
                      'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors duration-200',
                      selected ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
                    )}
                  >
                    <OptIcon size={15} />
                  </span>
                  <span
                    className={cn(
                      'text-xs font-semibold leading-snug transition-colors duration-200',
                      selected ? 'text-primary-700' : 'text-gray-600',
                    )}
                  >
                    {opt.label}
                  </span>
                  <AnimatePresence>
                    {selected && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gradient-to-b from-primary-500 to-primary-600 text-white shadow-glow"
                      >
                        <Check size={11} strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )
            })}
          </div>
        </motion.div>

        {!isEdit && (
          <motion.div {...fieldMotion(4)} className="space-y-1.5">
            <label className={labelClass}>{t('users.password')} *</label>
            <div className="relative">
              <Input
                required
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t('users.passwordPlaceholder')}
                className="h-11 px-4 pr-11 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 cursor-pointer place-items-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-navy-900"
                aria-label={showPassword ? t('users.hidePassword') : t('users.showPassword')}
              >
                {/* Đổi key để icon mắt nảy nhẹ khi chuyển trạng thái */}
                <motion.span
                  key={String(showPassword)}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, ease: 'easeOut' }}
                  className="block"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </motion.span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Mô tả quyền theo vai trò — chữ trượt mượt khi đổi lựa chọn */}
        <motion.div
          {...fieldMotion(isEdit ? 4 : 5)}
          className="flex items-start gap-2.5 rounded-xl border border-primary-100 bg-primary-50/70 p-3.5"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-primary-600 ring-1 ring-primary-100">
            <RoleIcon size={14} />
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={form.role}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="text-xs leading-relaxed text-primary-700"
            >
              {form.role === 'ADMIN' ? t('users.roleAdminDesc') : t('users.roleDriverDesc')}
            </motion.p>
          </AnimatePresence>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex items-start gap-2 rounded-xl border border-danger-100 bg-danger-50 px-3.5 py-2.5 text-sm text-danger-600"
            >
              <Info size={14} className="mt-0.5 shrink-0" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-3 border-t border-gray-100 bg-gray-50/60 p-5">
        <Button type="button" variant="secondary" onClick={onCancel} className="h-11 flex-1">
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={submitting} className="h-11 flex-1">
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> {t('users.saving')}
            </>
          ) : isEdit ? (
            t('users.saveChanges')
          ) : (
            t('users.createButton')
          )}
        </Button>
      </div>
    </form>
  )
}
