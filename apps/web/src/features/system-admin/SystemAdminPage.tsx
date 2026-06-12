import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Building2,
  Bus,
  CheckCircle2,
  ChevronLeft,
  Edit2,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Badge } from '../../components/ui/badge'
import { PageHeader } from '../../components/ui/page-header'
import { MetricCard } from '../../components/ui/metric-card'
import { DataTable, type Column } from '../../components/ui/data-table'
import { EmptyState } from '../../components/ui/empty-state'
import { SectionCard } from '../../components/ui/section-card'
import { cn } from '../../lib/utils'
import {
  useGetTenantsQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useGetTenantUsersQuery,
  useCreateTenantUserMutation,
  useUpdateTenantUserMutation,
  useRemoveTenantUserMutation,
  type TenantRow,
  type UserRow,
} from './systemAdminApi'

export default function SystemAdminPage() {
  const [selectedTenant, setSelectedTenant] = useState<TenantRow | null>(null)

  if (selectedTenant) {
    return <TenantUsersView tenant={selectedTenant} onBack={() => setSelectedTenant(null)} />
  }
  return <TenantsView onOpenTenant={setSelectedTenant} />
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/* Lấy tối đa 2 chữ cái đầu của tên để hiển thị avatar */
function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

/* Lớp gradient avatar theo vai trò người dùng — dùng chung cho bảng và drawer */
function roleGradientClass(role: UserRow['role']) {
  return role === 'ADMIN'
    ? 'bg-gradient-to-br from-primary-500 to-primary-700'
    : role === 'BUS_MANAGER'
      ? 'bg-gradient-to-br from-warning-500 to-warning-600'
      : 'bg-gradient-to-br from-gray-400 to-gray-600'
}

/* Viên tóm tắt nhỏ ở góc tiêu đề bảng (số liệu nhanh theo tông màu) */
function HeaderStatPill({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ring-1 ring-inset',
        className,
      )}
    >
      {children}
    </span>
  )
}

/* Nhãn trạng thái tenant kèm chấm màu */
function StatusBadge({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) {
  const { t } = useTranslation()
  return (
    <Badge variant={status === 'ACTIVE' ? 'success' : 'destructive'}>
      <span
        aria-hidden="true"
        className={cn(
          'mr-1.5 h-1.5 w-1.5 rounded-full',
          status === 'ACTIVE' ? 'bg-success-500' : 'bg-danger-500',
        )}
      />
      {t(`status.${status}`)}
    </Badge>
  )
}

function TenantsView({ onOpenTenant }: { onOpenTenant: (t: TenantRow) => void }) {
  const { t } = useTranslation()
  const { data: tenants = [], isLoading } = useGetTenantsQuery()
  const [showCreate, setShowCreate] = useState(false)
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null)
  const [updateTenant] = useUpdateTenantMutation()

  async function toggleStatus(tn: TenantRow) {
    await updateTenant({
      id: tn.id,
      status: tn.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    })
  }

  const activeCount = tenants.filter((tn) => tn.status === 'ACTIVE').length
  const suspendedCount = tenants.filter((tn) => tn.status === 'SUSPENDED').length

  const columns: Column<TenantRow>[] = [
    {
      key: 'name',
      header: t('systemAdmin.companyName'),
      sortValue: (tn) => tn.name,
      render: (tn) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-[11px] font-bold text-white shadow-inner-highlight ring-1 ring-black/[0.04]">
            {initialsOf(tn.name)}
          </div>
          <span className="truncate font-semibold text-navy-900">{tn.name}</span>
        </div>
      ),
    },
    {
      key: 'slug',
      header: t('systemAdmin.slug'),
      sortValue: (tn) => tn.slug,
      render: (tn) => (
        <code className="rounded-md bg-gray-100/80 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 ring-1 ring-inset ring-gray-200/60">
          {tn.slug}
        </code>
      ),
    },
    {
      key: 'status',
      header: t('common.status'),
      sortValue: (tn) => tn.status,
      render: (tn) => <StatusBadge status={tn.status} />,
    },
    {
      key: 'admins',
      header: t('systemAdmin.admins'),
      sortValue: (tn) => tn.adminsCount,
      render: (tn) => <CountPill value={tn.adminsCount} />,
    },
    {
      key: 'drivers',
      header: t('systemAdmin.drivers'),
      sortValue: (tn) => tn.managersCount,
      render: (tn) => <CountPill value={tn.managersCount} />,
    },
    {
      key: 'created',
      header: t('systemAdmin.created'),
      sortValue: (tn) => tn.createdAt,
      render: (tn) => (
        <span className="text-xs tabular-nums text-gray-500">
          {new Date(tn.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('common.actions'),
      align: 'right',
      render: (tn) => (
        // Chặn click lan ra dòng (dòng mở danh sách user của tenant)
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-[color,background-color,transform] duration-150 hover:bg-primary-50 hover:text-primary-600 active:scale-95"
            onClick={() => setEditTenant(tn)}
            aria-label={t('common.edit')}
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className={cn(
              'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold ring-1 ring-inset ring-transparent transition-[color,background-color,box-shadow,transform] duration-150 active:scale-95',
              tn.status === 'ACTIVE'
                ? 'text-warning-600 hover:bg-warning-500/10 hover:ring-warning-500/20'
                : 'text-success-600 hover:bg-success-600/10 hover:ring-success-600/20',
            )}
            onClick={() => toggleStatus(tn)}
          >
            {tn.status === 'ACTIVE' ? (
              <PauseCircle size={14} aria-hidden="true" />
            ) : (
              <PlayCircle size={14} aria-hidden="true" />
            )}
            {tn.status === 'ACTIVE' ? t('common.suspend') : t('common.activate')}
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        title={t('systemAdmin.title')}
        subtitle={
          tenants.length === 0
            ? t('systemAdmin.noOperators')
            : t('systemAdmin.subtitle', { count: tenants.length })
        }
        actions={
          <Button className="gap-2" onClick={() => setShowCreate(true)}>
            <Plus size={18} />
            {t('systemAdmin.addTenant')}
          </Button>
        }
      />

      {/* Dải chỉ số tổng quan — con số tự đếm tăng dần */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label={t('systemAdmin.totalTenants')}
          value={tenants.length}
          icon={Building2}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <MetricCard
          label={t('systemAdmin.active')}
          value={activeCount}
          icon={CheckCircle2}
          color="text-success-600"
          bg="bg-success-50"
        />
        <MetricCard
          label={t('systemAdmin.suspended')}
          value={suspendedCount}
          icon={PauseCircle}
          color="text-warning-600"
          bg="bg-warning-50"
        />
      </div>

      {/* Bảng tenant đóng khung trong SectionCard: tiêu đề + viên tóm tắt trạng thái */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
      >
        <SectionCard
          bodyClassName="p-0"
          title={
            <span className="inline-flex items-center gap-2.5">
              {t('systemAdmin.title')}
              <CountPill value={tenants.length} />
            </span>
          }
          headerAction={
            <div className="hidden items-center gap-2 sm:flex">
              <HeaderStatPill className="bg-success-50 text-success-700 ring-success-600/15">
                <span className="h-1.5 w-1.5 rounded-full bg-success-500" aria-hidden="true" />
                {activeCount} {t('systemAdmin.active')}
              </HeaderStatPill>
              <HeaderStatPill className="bg-danger-50 text-danger-600 ring-danger-500/15">
                <span className="h-1.5 w-1.5 rounded-full bg-danger-500" aria-hidden="true" />
                {suspendedCount} {t('systemAdmin.suspended')}
              </HeaderStatPill>
            </div>
          }
        >
          <DataTable
            className="rounded-none border-0 shadow-none"
            columns={columns}
            data={tenants}
            rowKey={(tn) => tn.id}
            loading={isLoading}
            onRowClick={(tn) => onOpenTenant(tn)}
            empty={
              <EmptyState
                icon={Building2}
                title={t('systemAdmin.noOperators')}
                description={t('systemAdmin.noOperatorsHelp')}
                action={
                  <Button size="sm" className="gap-2" onClick={() => setShowCreate(true)}>
                    <Plus size={15} /> {t('systemAdmin.addTenant')}
                  </Button>
                }
              />
            }
          />
        </SectionCard>
      </motion.div>

      <AnimatePresence>
        {showCreate && <AddTenantModal onClose={() => setShowCreate(false)} />}
        {editTenant && (
          <EditTenantModal tenant={editTenant} onClose={() => setEditTenant(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* Ô số đếm nhỏ trong bảng (số admin / tài xế) */
function CountPill({ value }: { value: number }) {
  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-lg bg-gray-100/80 px-2 text-xs font-semibold tabular-nums text-gray-700 ring-1 ring-inset ring-gray-200/60">
      {value}
    </span>
  )
}

/* Nhóm nút chọn dạng segmented: thumb trắng trượt bằng layoutId */
function SegmentedField<T extends string>({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: T
  options: { value: T; label: React.ReactNode; activeClass?: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1 rounded-xl bg-gray-100 p-1 ring-1 ring-inset ring-gray-200/60">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={cn(
              'relative h-9 flex-1 cursor-pointer rounded-lg text-sm font-semibold transition-colors duration-150',
              active ? (opt.activeClass ?? 'text-primary-700') : 'text-gray-500 hover:text-gray-800',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                transition={{ type: 'spring', stiffness: 500, damping: 34 }}
                className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-black/[0.04]"
                aria-hidden="true"
              />
            )}
            <span className="relative z-10 inline-flex items-center justify-center gap-1.5">
              {opt.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* Thông báo lỗi form — trượt vào nhẹ khi xuất hiện */
function FormError({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-start gap-2 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger-600 ring-1 ring-inset ring-danger-100"
    >
      <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      {message}
    </motion.p>
  )
}

function AddTenantModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugDirty, setSlugDirty] = useState(false)
  const [error, setError] = useState('')
  const [createTenant, { isLoading }] = useCreateTenantMutation()

  function handleNameChange(value: string) {
    setName(value)
    if (!slugDirty) setSlug(slugify(value))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createTenant({ name, slug }).unwrap()
      onClose()
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setError(typeof message === 'string' ? message : t('systemAdmin.failedCreateTenant'))
    }
  }

  return (
    <ModalShell title={t('systemAdmin.addTenantTitle')} icon={Building2} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label={`${t('systemAdmin.companyName')} *`}>
          <Input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="Acme Travel"
            className="h-11 font-medium"
          />
        </FieldLabel>
        <FieldLabel label={`${t('systemAdmin.slug')} *`}>
          <Input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugDirty(true)
            }}
            required
            pattern="^[a-z0-9-]+$"
            placeholder="acme-travel"
            className="h-11 font-mono text-xs"
          />
        </FieldLabel>

        {/* Xem trước nhận diện tenant — avatar và slug cập nhật trực tiếp khi gõ */}
        <AnimatePresence initial={false}>
          {name.trim() && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-3 rounded-xl border border-primary-100 bg-gradient-to-r from-primary-50/80 to-sky-50/40 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-[11px] font-bold text-white shadow-inner-highlight ring-1 ring-black/[0.04]">
                  {initialsOf(name)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-900">{name}</p>
                  <code className="font-mono text-[11px] text-primary-700">
                    {slug || slugify(name)}
                  </code>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {isLoading ? t('systemAdmin.creating') : t('systemAdmin.createOperator')}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

function EditTenantModal({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState(tenant.name)
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>(tenant.status)
  const [error, setError] = useState('')
  const [updateTenant, { isLoading }] = useUpdateTenantMutation()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateTenant({ id: tenant.id, name, status }).unwrap()
      onClose()
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setError(typeof message === 'string' ? message : t('systemAdmin.failedUpdateTenant'))
    }
  }

  return (
    <ModalShell title={t('systemAdmin.editTenantTitle')} icon={Edit2} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label={t('systemAdmin.companyName')}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 font-medium"
          />
        </FieldLabel>
        <FieldLabel label={t('common.status')}>
          <SegmentedField
            id="tenant-status"
            value={status}
            onChange={setStatus}
            options={[
              {
                value: 'ACTIVE',
                label: (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-success-500" aria-hidden="true" />
                    {t('status.ACTIVE')}
                  </>
                ),
                activeClass: 'text-success-700',
              },
              {
                value: 'SUSPENDED',
                label: (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-danger-500" aria-hidden="true" />
                    {t('status.SUSPENDED')}
                  </>
                ),
                activeClass: 'text-danger-600',
              },
            ]}
          />
        </FieldLabel>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {isLoading ? t('systemAdmin.saving') : t('systemAdmin.saveChanges')}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

function TenantUsersView({ tenant, onBack }: { tenant: TenantRow; onBack: () => void }) {
  const { t } = useTranslation()
  const { data: users = [], isLoading } = useGetTenantUsersQuery(tenant.id)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [removeUser] = useRemoveTenantUserMutation()
  const [updateUser, { isLoading: updating }] = useUpdateTenantUserMutation()

  async function handleRemove(u: UserRow) {
    if (!confirm(t('systemAdmin.confirmRemoveUser', { name: u.name, email: u.email }))) return
    await removeUser({ tenantId: tenant.id, userId: u.id })
  }

  const adminsCount = users.filter((u) => u.role === 'ADMIN').length
  const driversCount = users.filter((u) => u.role === 'BUS_MANAGER').length

  const columns: Column<UserRow>[] = [
    {
      key: 'name',
      header: t('systemAdmin.nameColumn'),
      sortValue: (u) => u.name,
      render: (u) => (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-inner-highlight ring-1 ring-black/[0.04]',
              roleGradientClass(u.role),
            )}
          >
            {initialsOf(u.name)}
          </div>
          <span className="truncate font-semibold text-navy-900">{u.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      header: t('systemAdmin.emailColumn'),
      sortValue: (u) => u.email,
      render: (u) => <span className="text-gray-600">{u.email}</span>,
    },
    {
      key: 'phone',
      header: t('systemAdmin.phoneColumn'),
      render: (u) => (
        <span className="font-mono text-xs tabular-nums text-gray-600">{u.phone ?? '—'}</span>
      ),
    },
    {
      key: 'role',
      header: t('systemAdmin.roleColumn'),
      sortValue: (u) => u.role,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'joined',
      header: t('systemAdmin.joinedColumn'),
      sortValue: (u) => u.createdAt,
      render: (u) => (
        <span className="text-xs tabular-nums text-gray-500">
          {new Date(u.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: 'actions',
      header: t('systemAdmin.actionsColumn'),
      align: 'right',
      render: (u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => setEditUser(u)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-primary-50 hover:text-primary-600"
            aria-label={t('common.edit')}
          >
            <Edit2 size={15} />
          </button>
          <button
            onClick={() => handleRemove(u)}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-danger-50 hover:text-danger-600"
            aria-label={t('systemAdmin.removeUser')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-8">
      <PageHeader
        leading={
          <button
            onClick={onBack}
            aria-label={t('common.back')}
            className="mb-1 inline-flex cursor-pointer items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-gray-500 transition-colors duration-150 hover:text-primary-600"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            {t('systemAdmin.tenantUsers')}
          </button>
        }
        title={tenant.name}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <code className="rounded-md bg-gray-100/80 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 ring-1 ring-inset ring-gray-200/60">
              {tenant.slug}
            </code>
            <StatusBadge status={tenant.status} />
          </span>
        }
        actions={
          <Button className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus size={18} /> {t('systemAdmin.addUser')}
          </Button>
        }
      />

      {/* Dải chỉ số người dùng của tenant */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label={t('systemAdmin.users')}
          value={users.length}
          icon={Users}
          color="text-primary-600"
          bg="bg-primary-50"
        />
        <MetricCard
          label={t('systemAdmin.admins')}
          value={adminsCount}
          icon={ShieldCheck}
          color="text-success-600"
          bg="bg-success-50"
        />
        <MetricCard
          label={t('systemAdmin.drivers')}
          value={driversCount}
          icon={Bus}
          color="text-warning-600"
          bg="bg-warning-50"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.05 }}
      >
        <DataTable
          columns={columns}
          data={users}
          rowKey={(u) => u.id}
          loading={isLoading}
          empty={
            <EmptyState
              icon={Users}
              title={t('systemAdmin.noUsers')}
              description={t('systemAdmin.noUsersHelp')}
              action={
                <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
                  <Plus size={15} /> {t('systemAdmin.addUser')}
                </Button>
              }
            />
          }
        />
      </motion.div>

      <AnimatePresence>
        {showAdd && <AddUserModal tenantId={tenant.id} onClose={() => setShowAdd(false)} />}
        {editUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setEditUser(null)}
              className="fixed inset-0 z-[60] bg-navy-950/45 backdrop-blur-sm"
            />
            {/* Drawer chỉnh sửa user — trượt vào bằng spring */}
            <motion.div
              initial={{ x: 440 }}
              animate={{ x: 0 }}
              exit={{ x: 440, transition: { duration: 0.2, ease: 'easeIn' } }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              role="dialog"
              aria-modal="true"
              className="fixed inset-y-0 right-0 z-[70] flex w-[420px] max-w-[calc(100vw-24px)] flex-col bg-white shadow-float"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-gray-50/80 to-transparent px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-inner-highlight ring-1 ring-black/[0.04]',
                      roleGradientClass(editUser.role),
                    )}
                  >
                    <UserCog size={18} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold tracking-tight text-navy-900">
                      {t('systemAdmin.editUserTitle')}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-500">Update user details and role</p>
                  </div>
                </div>
                <button
                  onClick={() => setEditUser(null)}
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700"
                  aria-label={t('common.close')}
                >
                  <X size={18} />
                </button>
              </div>
              <EditUserForm
                user={editUser}
                onSubmit={async (data) => {
                  await updateUser({
                    tenantId: tenant.id,
                    userId: editUser.id,
                    ...data,
                  }).unwrap()
                  setEditUser(null)
                }}
                onCancel={() => setEditUser(null)}
                isLoading={updating}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function RoleBadge({ role }: { role: UserRow['role'] }) {
  const { t } = useTranslation()
  const label =
    role === 'BUS_MANAGER'
      ? t('systemAdmin.drivers')
      : role === 'ADMIN'
        ? t('systemAdmin.admins')
        : t('nav.systemAdmin')
  return (
    <Badge
      variant={role === 'SYSTEM_ADMIN' ? 'secondary' : role}
      className="text-[10px] font-bold uppercase tracking-widest"
      label={label}
    />
  )
}

function AddUserModal({ tenantId, onClose }: { tenantId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'ADMIN' | 'BUS_MANAGER'>('ADMIN')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [createUser, { isLoading }] = useCreateTenantUserMutation()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createUser({ tenantId, name, email, role, password }).unwrap()
      onClose()
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setError(typeof message === 'string' ? message : t('systemAdmin.failedCreateUser'))
    }
  }

  return (
    <ModalShell title={t('systemAdmin.addUserTitle')} icon={UserPlus} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label={`${t('passengers.fullName')} *`}>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-11 font-medium"
          />
        </FieldLabel>
        <FieldLabel label={`${t('auth.email')} *`}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-11 font-medium"
          />
        </FieldLabel>
        <FieldLabel label={`${t('systemAdmin.role')} *`}>
          <SegmentedField
            id="add-user-role"
            value={role}
            onChange={setRole}
            options={[
              {
                value: 'ADMIN',
                label: (
                  <>
                    <ShieldCheck size={14} aria-hidden="true" />
                    {t('systemAdmin.admins')}
                  </>
                ),
              },
              {
                value: 'BUS_MANAGER',
                label: (
                  <>
                    <Bus size={14} aria-hidden="true" />
                    {t('systemAdmin.drivers')}
                  </>
                ),
              },
            ]}
          />
        </FieldLabel>
        <FieldLabel label={`${t('systemAdmin.tempPassword')} *`}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="h-11 font-medium"
          />
        </FieldLabel>

        {error && <FormError message={error} />}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading} className="gap-2">
            {isLoading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
            {isLoading ? t('systemAdmin.creating') : t('systemAdmin.createUser')}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

function EditUserForm({
  user,
  onSubmit,
  onCancel,
  isLoading,
}: {
  user: UserRow
  onSubmit: (data: {
    name: string
    email: string
    phone: string
    role: 'ADMIN' | 'BUS_MANAGER'
  }) => Promise<void>
  onCancel: () => void
  isLoading: boolean
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    role: (user.role === 'BUS_MANAGER' ? 'BUS_MANAGER' : 'ADMIN') as 'ADMIN' | 'BUS_MANAGER',
  })
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (form.phone && !/^\d{10}$/.test(form.phone)) {
      setError('Phone must be exactly 10 digits')
      return
    }

    try {
      await onSubmit(form)
    } catch (err: unknown) {
      const msg = (err as { data?: { message?: string } })?.data?.message
      setError(typeof msg === 'string' ? msg : t('systemAdmin.failedUpdateUser'))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto p-6">
        <FieldLabel label={t('passengers.fullName')}>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t('users.fullNamePlaceholder')}
            className="h-11 font-medium"
          />
        </FieldLabel>

        <FieldLabel label={t('auth.email')}>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="user@example.com"
            className="h-11 font-medium"
          />
        </FieldLabel>

        <FieldLabel label="Phone Number">
          <Input
            value={form.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setForm({ ...form, phone: val })
            }}
            maxLength={10}
            placeholder="0901234567"
            className="h-11 font-mono tabular-nums"
          />
          <div className="flex justify-between">
            <p className="text-[11px] text-gray-500">10 digits only</p>
            <p
              className={cn(
                'text-[11px] font-semibold tabular-nums',
                form.phone.length === 10
                  ? 'text-success-600'
                  : form.phone.length > 0
                    ? 'text-warning-500'
                    : 'text-gray-400',
              )}
            >
              {form.phone.length}/10
            </p>
          </div>
        </FieldLabel>

        <FieldLabel label={t('systemAdmin.role')}>
          <SegmentedField
            id="edit-user-role"
            value={form.role}
            onChange={(role) => setForm({ ...form, role })}
            options={[
              { value: 'ADMIN', label: 'Admin — Điều phối viên' },
              { value: 'BUS_MANAGER', label: 'BusManager — Tài xế' },
            ]}
          />
        </FieldLabel>

        {/* Ghi chú quyền hạn theo vai trò — đổi nội dung mượt khi chọn vai trò khác */}
        <div className="rounded-xl border border-primary-100 bg-primary-50 p-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={form.role}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="flex items-start gap-2"
            >
              {form.role === 'ADMIN' ? (
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
              ) : (
                <Bus size={15} className="mt-0.5 shrink-0 text-primary-600" aria-hidden="true" />
              )}
              <p className="text-[11px] leading-relaxed text-primary-700">
                {form.role === 'ADMIN'
                  ? 'Admin có quyền quản lý chuyến đi, xe, hành khách và xem live dashboard.'
                  : 'BusManager (Tài xế) chỉ có quyền điểm danh hành khách trên xe được phân công.'}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {error && <FormError message={error} />}
      </div>

      <div className="flex gap-3 border-t border-border bg-gray-50/50 p-6">
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1 gap-2">
          {isLoading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
          {isLoading ? t('systemAdmin.saving') : t('systemAdmin.saveChanges')}
        </Button>
      </div>
    </form>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="ml-1 text-[11px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      {children}
    </div>
  )
}

/* Khung modal dùng chung: backdrop mờ navy + panel spring scale-in */
function ModalShell({
  title,
  icon: Icon,
  onClose,
  children,
}: {
  title: string
  icon?: React.ElementType
  onClose: () => void
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-950/45 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8, transition: { duration: 0.15, ease: 'easeIn' } }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-float ring-1 ring-black/5"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border bg-gradient-to-r from-gray-50/80 to-transparent px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {Icon && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-inner-highlight ring-1 ring-black/[0.04]">
                <Icon size={18} aria-hidden="true" />
              </div>
            )}
            <h2 className="truncate text-lg font-semibold tracking-tight text-navy-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-400 transition-colors duration-150 hover:bg-gray-100 hover:text-gray-700"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </motion.div>
  )
}
