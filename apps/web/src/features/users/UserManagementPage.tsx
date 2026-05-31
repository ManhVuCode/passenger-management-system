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
import { MetricCard } from '../../components/ui/metric-card'
import { PageHeader } from '../../components/ui/page-header'
import { EmptyState } from '../../components/ui/empty-state'
import { ConfirmDialog } from '../../components/ui/confirm-dialog'
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
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                u.role === 'ADMIN' ? 'bg-primary-50 text-primary-600' : 'bg-[#fff7ed] text-[#c2410c]',
              )}
            >
              {u.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span className="font-semibold text-navy-900">{u.name}</span>
            {isSelf && (
              <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest">
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
      render: (u) => <span className="text-gray-600">{u.phone ?? '—'}</span>,
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
      render: (u) => <span className="text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (u) => {
        const isSelf = u.id === currentUserId
        return (
          <div className="flex items-center gap-1 justify-end">
            <button
              onClick={() => openEdit(u)}
              className="cursor-pointer p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              aria-label={t('common.edit')}
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => !isSelf && setDeletingUser(u)}
              disabled={isSelf}
              title={isSelf ? t('users.cannotDeleteSelf') : undefined}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                isSelf
                  ? 'text-gray-200 cursor-not-allowed'
                  : 'cursor-pointer text-gray-400 hover:text-danger-600 hover:bg-danger-50',
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

  if (isLoading) {
    return <div className="p-8 text-gray-400 text-sm">{t('common.loading')}</div>
  }

  return (
    <div className="p-8">
      {/* Header */}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
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

      {/* Search */}
      <div className="relative mb-4">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('users.searchPlaceholder')}
          className="w-full h-10 pl-9 pr-4 bg-white border border-gray-200 rounded-xl
                     text-sm focus:outline-none focus:ring-4 focus:ring-primary-600/10
                     focus:border-primary-600 transition-all shadow-sm"
        />
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(u) => u.id}
        empty={
          <EmptyState
            icon={Users}
            title={users.length === 0 ? t('users.noUsers') : t('users.noResults')}
          />
        }
      />

      {/* Create/Edit slide-in panel */}
      <AnimatePresence>
        {isPanelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPanelOpen(false)}
              className="fixed inset-0 bg-gray-950/20 backdrop-blur-[2px] z-[60]"
            />
            <motion.div
              initial={{ x: 460 }}
              animate={{ x: 0 }}
              exit={{ x: 460 }}
              className="fixed top-0 right-0 bottom-0 w-[460px] bg-white shadow-2xl z-[70] border-l border-gray-100 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-bold text-navy-900">
                    {editingUser ? t('users.editTitle') : t('users.createTitle')}
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingUser ? t('users.editSubtitle') : t('users.createSubtitle')}
                  </p>
                </div>
                <button
                  onClick={() => setIsPanelOpen(false)}
                  className="cursor-pointer p-2 text-gray-400 hover:text-navy-900 hover:bg-white rounded-full transition-all"
                  aria-label={t('common.close')}
                >
                  <X size={20} />
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

      {/* Delete confirm */}
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

// ── UserForm ────────────────────────────────────────────────
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

  const fieldClass =
    'w-full h-11 px-4 bg-white border border-gray-200 rounded-xl ' +
    'focus:outline-none focus:ring-4 focus:ring-primary-600/10 focus:border-primary-600 ' +
    'transition-all text-sm font-medium'
  const labelClass =
    'text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] ml-1'

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

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="space-y-1.5">
          <label className={labelClass}>{t('users.fullName')} *</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('users.fullNamePlaceholder')}
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>{t('users.email')} *</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="user@company.com"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>{t('users.phone')}</label>
          <input
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })
            }
            maxLength={10}
            placeholder="0901234567"
            className={fieldClass}
          />
          <div className="flex justify-between">
            <span className="text-[10px] text-gray-400">{t('users.phoneHint')}</span>
            <span
              className={cn(
                'text-[10px] font-medium',
                form.phone.length === 10
                  ? 'text-success-600'
                  : form.phone.length > 0
                    ? 'text-warning-500'
                    : 'text-gray-400',
              )}
            >
              {form.phone.length}/10
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>{t('users.role')} *</label>
          <select
            value={form.role}
            onChange={(e) =>
              setForm({ ...form, role: e.target.value as 'ADMIN' | 'BUS_MANAGER' })
            }
            className={fieldClass + ' cursor-pointer'}
          >
            <option value="ADMIN">{t('users.roleAdminFull')}</option>
            <option value="BUS_MANAGER">{t('users.roleDriverFull')}</option>
          </select>
        </div>

        {!isEdit && (
          <div className="space-y-1.5">
            <label className={labelClass}>{t('users.password')} *</label>
            <div className="relative">
              <input
                required
                type={showPassword ? 'text' : 'password'}
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={t('users.passwordPlaceholder')}
                className={fieldClass + ' pr-10'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-900 transition-colors"
                aria-label={showPassword ? t('users.hidePassword') : t('users.showPassword')}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        <div className="p-3 bg-primary-50 rounded-xl border border-primary-100 flex items-start gap-2.5">
          <RoleIcon size={16} className="text-primary-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-primary-600 leading-relaxed">
            {form.role === 'ADMIN' ? t('users.roleAdminDesc') : t('users.roleDriverDesc')}
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2 flex items-start gap-2">
            <Info size={14} className="shrink-0 mt-0.5" />
            {error}
          </p>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer flex-1 h-11 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-600/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {submitting
            ? t('users.saving')
            : isEdit
              ? t('users.saveChanges')
              : t('users.createButton')}
        </button>
      </div>
    </form>
  )
}
