import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useTranslation } from 'react-i18next'
import { Building2, ChevronLeft, Edit2, Plus, Trash2, Users, X } from 'lucide-react'
import { Button } from '../../components/ui/button'
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

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">{t('systemAdmin.title')}</h1>
          <p className="text-gray-600 mt-1">
            {tenants.length === 0
              ? t('systemAdmin.noOperators')
              : t('systemAdmin.subtitle', { count: tenants.length })}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          {t('systemAdmin.addTenant')}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : tenants.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-12 text-center flex flex-col items-center gap-3">
          <Building2 size={36} className="text-gray-300" />
          <p className="text-gray-950 font-bold">{t('systemAdmin.noOperators')}</p>
          <p className="text-gray-500 text-sm">{t('systemAdmin.noOperatorsHelp')}</p>
          <Button className="gap-2 mt-2" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {t('systemAdmin.addTenant')}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <th className="px-5 py-3">{t('systemAdmin.companyName')}</th>
                <th className="px-5 py-3">{t('systemAdmin.slug')}</th>
                <th className="px-5 py-3">{t('common.status')}</th>
                <th className="px-5 py-3">{t('systemAdmin.admins')}</th>
                <th className="px-5 py-3">{t('systemAdmin.drivers')}</th>
                <th className="px-5 py-3">{t('systemAdmin.created')}</th>
                <th className="px-5 py-3 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tn, idx) => (
                <tr
                  key={tn.id}
                  className={cn(
                    'h-14 border-t border-gray-100 cursor-pointer hover:bg-primary-50/40',
                    idx % 2 === 1 && 'bg-gray-50/40',
                  )}
                  onClick={() => onOpenTenant(tn)}
                >
                  <td className="px-5 font-bold text-gray-950">{tn.name}</td>
                  <td className="px-5 text-gray-500 font-mono text-xs">{tn.slug}</td>
                  <td className="px-5">
                    <StatusPill status={tn.status} />
                  </td>
                  <td className="px-5 text-gray-600">{tn.adminsCount}</td>
                  <td className="px-5 text-gray-600">{tn.managersCount}</td>
                  <td className="px-5 text-gray-500 text-xs">
                    {new Date(tn.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        onClick={() => setEditTenant(tn)}
                        aria-label={t('common.edit')}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className={cn(
                          'px-3 h-8 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors',
                          tn.status === 'ACTIVE'
                            ? 'text-warning-600 hover:bg-warning-500/10'
                            : 'text-success-600 hover:bg-success-600/10',
                        )}
                        onClick={() => toggleStatus(tn)}
                      >
                        {tn.status === 'ACTIVE'
                          ? t('common.suspend')
                          : t('common.activate')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showCreate && <AddTenantModal onClose={() => setShowCreate(false)} />}
        {editTenant && (
          <EditTenantModal tenant={editTenant} onClose={() => setEditTenant(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function StatusPill({ status }: { status: 'ACTIVE' | 'SUSPENDED' }) {
  const { t } = useTranslation()
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center px-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
        status === 'ACTIVE'
          ? 'bg-success-600/10 text-success-600'
          : 'bg-danger-600/10 text-danger-600',
      )}
    >
      {t(`status.${status}`)}
    </span>
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
    <ModalShell title={t('systemAdmin.addTenantTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label={`${t('systemAdmin.companyName')} *`}>
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="Acme Travel"
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label={`${t('systemAdmin.slug')} *`}>
          <input
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value)
              setSlugDirty(true)
            }}
            required
            pattern="^[a-z0-9-]+$"
            placeholder="acme-travel"
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-mono text-xs"
          />
        </FieldLabel>

        {error && (
          <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
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
    <ModalShell title={t('systemAdmin.editTenantTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label={t('systemAdmin.companyName')}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label={t('common.status')}>
          <div className="flex gap-2">
            {(['ACTIVE', 'SUSPENDED'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                className={cn(
                  'flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-widest transition-all',
                  status === value
                    ? value === 'ACTIVE'
                      ? 'bg-success-600 text-white'
                      : 'bg-danger-600 text-white'
                    : 'bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100',
                )}
              >
                {t(`status.${value}`)}
              </button>
            ))}
          </div>
        </FieldLabel>

        {error && (
          <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
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

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
            aria-label={t('common.back')}
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              {t('systemAdmin.tenantUsers')}
            </p>
            <h1 className="text-3xl font-bold text-gray-950">{tenant.name}</h1>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {t('systemAdmin.addUser')}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-gray-400">{t('common.loading')}</p>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-12 text-center flex flex-col items-center gap-3">
          <Users size={36} className="text-gray-300" />
          <p className="text-gray-950 font-bold">{t('systemAdmin.noUsers')}</p>
          <p className="text-gray-500 text-sm">{t('systemAdmin.noUsersHelp')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <th className="px-5 py-3">{t('systemAdmin.nameColumn')}</th>
                <th className="px-5 py-3">{t('systemAdmin.emailColumn')}</th>
                <th className="px-5 py-3">{t('systemAdmin.phoneColumn')}</th>
                <th className="px-5 py-3">{t('systemAdmin.roleColumn')}</th>
                <th className="px-5 py-3">{t('systemAdmin.joinedColumn')}</th>
                <th className="px-5 py-3 text-right">{t('systemAdmin.actionsColumn')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, idx) => (
                <tr
                  key={u.id}
                  className={cn(
                    'h-14 border-t border-gray-100',
                    idx % 2 === 1 && 'bg-gray-50/40',
                  )}
                >
                  <td className="px-5 font-bold text-gray-950">{u.name}</td>
                  <td className="px-5 text-gray-500">{u.email}</td>
                  <td className="px-5 text-gray-500">{u.phone ?? '—'}</td>
                  <td className="px-5">
                    <RolePill role={u.role} />
                  </td>
                  <td className="px-5 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setEditUser(u)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        aria-label={t('common.edit')}
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleRemove(u)}
                        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        aria-label={t('systemAdmin.removeUser')}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {showAdd && <AddUserModal tenantId={tenant.id} onClose={() => setShowAdd(false)} />}
        {editUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditUser(null)}
              className="fixed inset-0 bg-gray-950/20 backdrop-blur-[2px] z-[60]"
            />
            <motion.div
              initial={{ x: 420 }}
              animate={{ x: 0 }}
              exit={{ x: 420 }}
              className="fixed top-0 right-0 bottom-0 w-[420px] bg-white shadow-2xl z-[70] border-l border-gray-100 flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                  <h2 className="font-bold text-gray-950">Edit User</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Update user details and role
                  </p>
                </div>
                <button
                  onClick={() => setEditUser(null)}
                  className="p-2 text-gray-400 hover:text-gray-950 hover:bg-white rounded-full transition-all"
                  aria-label="Close"
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

function RolePill({ role }: { role: UserRow['role'] }) {
  const { t } = useTranslation()
  const map = {
    ADMIN: 'bg-primary-50 text-primary-600',
    BUS_MANAGER: 'bg-[#fff7ed] text-[#c2410c]',
    SYSTEM_ADMIN: 'bg-gray-100 text-gray-600',
  } as const
  const label =
    role === 'BUS_MANAGER'
      ? t('systemAdmin.drivers')
      : role === 'ADMIN'
        ? t('systemAdmin.admins')
        : t('nav.systemAdmin')
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center px-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
        map[role],
      )}
    >
      {label}
    </span>
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
    <ModalShell title={t('systemAdmin.addUserTitle')} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label={`${t('passengers.fullName')} *`}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label={`${t('auth.email')} *`}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label={`${t('systemAdmin.role')} *`}>
          <div className="flex gap-2">
            {(['ADMIN', 'BUS_MANAGER'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={cn(
                  'flex-1 h-11 rounded-xl text-sm font-bold uppercase tracking-widest transition-all',
                  role === r
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-50 border border-gray-100 text-gray-500 hover:bg-gray-100',
                )}
              >
                {r === 'BUS_MANAGER' ? t('systemAdmin.drivers') : t('systemAdmin.admins')}
              </button>
            ))}
          </div>
        </FieldLabel>
        <FieldLabel label={`${t('systemAdmin.tempPassword')} *`}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>

        {error && (
          <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isLoading}>
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
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone ?? '',
    role: (user.role === 'BUS_MANAGER' ? 'BUS_MANAGER' : 'ADMIN') as 'ADMIN' | 'BUS_MANAGER',
  })
  const [error, setError] = useState('')

  const fieldClass =
    'w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all text-sm font-medium'
  const labelClass = 'text-[10px] font-bold text-gray-400 uppercase tracking-widest'

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
      setError(typeof msg === 'string' ? msg : 'Failed to update user')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div className="space-y-1.5">
          <label className={labelClass}>Full Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Nguyen Van A"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="user@example.com"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Phone Number</label>
          <input
            value={form.phone}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '')
              setForm({ ...form, phone: val })
            }}
            maxLength={10}
            placeholder="0901234567"
            className={fieldClass}
          />
          <div className="flex justify-between">
            <p className="text-[10px] text-gray-400">10 digits only</p>
            <p
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
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className={labelClass}>Role</label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as 'ADMIN' | 'BUS_MANAGER' })}
            className={fieldClass}
          >
            <option value="ADMIN">Admin — Điều phối viên</option>
            <option value="BUS_MANAGER">BusManager — Tài xế</option>
          </select>
        </div>

        <div className="p-3 bg-primary-50 rounded-xl border border-primary-100">
          <p className="text-[11px] text-primary-600 leading-relaxed">
            {form.role === 'ADMIN'
              ? '🗂 Admin có quyền quản lý chuyến đi, xe, hành khách và xem live dashboard.'
              : '🚌 BusManager (Tài xế) chỉ có quyền điểm danh hành khách trên xe được phân công.'}
          </p>
        </div>

        {error && (
          <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 h-11 rounded-xl bg-primary-600 text-white text-sm font-medium hover:bg-primary-600/90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {isLoading ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
        {label}
      </label>
      {children}
    </div>
  )
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-gray-950/30 backdrop-blur-[2px] z-[60]"
      />
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] max-w-[calc(100vw-32px)] bg-white rounded-2xl shadow-2xl z-[70] border border-gray-100 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-950">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-950 rounded-full hover:bg-gray-100 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </>
  )
}
