import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
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
  const { data: tenants = [], isLoading } = useGetTenantsQuery()
  const [showCreate, setShowCreate] = useState(false)
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null)
  const [updateTenant] = useUpdateTenantMutation()

  async function toggleStatus(t: TenantRow) {
    await updateTenant({
      id: t.id,
      status: t.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    })
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-950">Tenants</h1>
          <p className="text-gray-600 mt-1">
            {tenants.length === 0
              ? 'No operators yet.'
              : `${tenants.length} operator${tenants.length === 1 ? '' : 's'} on the platform`}
          </p>
        </div>
        <Button className="gap-2" onClick={() => setShowCreate(true)}>
          <Plus size={18} />
          Add Tenant
        </Button>
      </header>

      {isLoading ? (
        <p className="text-gray-400">Loading tenants…</p>
      ) : tenants.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-12 text-center flex flex-col items-center gap-3">
          <Building2 size={36} className="text-gray-300" />
          <p className="text-gray-950 font-bold">No operators yet</p>
          <p className="text-gray-500 text-sm">Add your first tour operator</p>
          <Button className="gap-2 mt-2" onClick={() => setShowCreate(true)}>
            <Plus size={16} /> Add Tenant
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <th className="px-5 py-3">Company Name</th>
                <th className="px-5 py-3">Slug</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Admins</th>
                <th className="px-5 py-3">Drivers</th>
                <th className="px-5 py-3">Created</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t, idx) => (
                <tr
                  key={t.id}
                  className={cn(
                    'h-14 border-t border-gray-100 cursor-pointer hover:bg-primary-50/40',
                    idx % 2 === 1 && 'bg-gray-50/40',
                  )}
                  onClick={() => onOpenTenant(t)}
                >
                  <td className="px-5 font-bold text-gray-950">{t.name}</td>
                  <td className="px-5 text-gray-500 font-mono text-xs">{t.slug}</td>
                  <td className="px-5">
                    <StatusPill status={t.status} />
                  </td>
                  <td className="px-5 text-gray-600">{t.adminsCount}</td>
                  <td className="px-5 text-gray-600">{t.managersCount}</td>
                  <td className="px-5 text-gray-500 text-xs">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5">
                    <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        onClick={() => setEditTenant(t)}
                        aria-label="Edit tenant"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        className={cn(
                          'px-3 h-8 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-colors',
                          t.status === 'ACTIVE'
                            ? 'text-warning-600 hover:bg-warning-500/10'
                            : 'text-success-600 hover:bg-success-600/10',
                        )}
                        onClick={() => toggleStatus(t)}
                      >
                        {t.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
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
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center px-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest',
        status === 'ACTIVE'
          ? 'bg-success-600/10 text-success-600'
          : 'bg-danger-600/10 text-danger-600',
      )}
    >
      {status}
    </span>
  )
}

function AddTenantModal({ onClose }: { onClose: () => void }) {
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
      setError(typeof message === 'string' ? message : 'Failed to create tenant')
    }
  }

  return (
    <ModalShell title="Add Operator" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label="Company Name *">
          <input
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            placeholder="Acme Travel"
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label="Slug *">
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
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating…' : 'Create Operator'}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

function EditTenantModal({ tenant, onClose }: { tenant: TenantRow; onClose: () => void }) {
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
      setError(typeof message === 'string' ? message : 'Failed to update tenant')
    }
  }

  return (
    <ModalShell title="Edit Operator" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label="Company Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label="Status">
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
                {value}
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
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

function TenantUsersView({ tenant, onBack }: { tenant: TenantRow; onBack: () => void }) {
  const { data: users = [], isLoading } = useGetTenantUsersQuery(tenant.id)
  const [showAdd, setShowAdd] = useState(false)
  const [editUser, setEditUser] = useState<UserRow | null>(null)
  const [removeUser] = useRemoveTenantUserMutation()

  async function handleRemove(u: UserRow) {
    if (!confirm(`Remove ${u.name} (${u.email})?`)) return
    await removeUser({ tenantId: tenant.id, userId: u.id })
  }

  return (
    <div className="p-8">
      <header className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="h-10 w-10 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100"
            aria-label="Back to tenants"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              Tenant Users
            </p>
            <h1 className="text-3xl font-bold text-gray-950">{tenant.name}</h1>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setShowAdd(true)}>
          <Plus size={18} /> Add User
        </Button>
      </header>

      {isLoading ? (
        <p className="text-gray-400">Loading users…</p>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-12 text-center flex flex-col items-center gap-3">
          <Users size={36} className="text-gray-300" />
          <p className="text-gray-950 font-bold">No users yet</p>
          <p className="text-gray-500 text-sm">Add the first Admin or BusManager for this tenant</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Joined</th>
                <th className="px-5 py-3 text-right">Actions</th>
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
                  <td className="px-5"><RolePill role={u.role} /></td>
                  <td className="px-5 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => setEditUser(u)}
                        className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        aria-label="Edit user"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => handleRemove(u)}
                        className="p-2 text-gray-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                        aria-label="Remove user"
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
          <EditUserModal
            tenantId={tenant.id}
            user={editUser}
            onClose={() => setEditUser(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function RolePill({ role }: { role: UserRow['role'] }) {
  const map = {
    ADMIN: 'bg-primary-50 text-primary-600',
    BUS_MANAGER: 'bg-[#fff7ed] text-[#c2410c]',
    SYSTEM_ADMIN: 'bg-gray-100 text-gray-600',
  } as const
  const label = role === 'BUS_MANAGER' ? 'BusManager' : role === 'ADMIN' ? 'Admin' : 'System Admin'
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
      setError(typeof message === 'string' ? message : 'Failed to create user')
    }
  }

  return (
    <ModalShell title="Add User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label="Full Name *">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label="Email *">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        <FieldLabel label="Role *">
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
                {r === 'BUS_MANAGER' ? 'BusManager' : 'Admin'}
              </button>
            ))}
          </div>
        </FieldLabel>
        <FieldLabel label="Temporary Password *">
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
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating…' : 'Create User'}
          </Button>
        </div>
      </form>
    </ModalShell>
  )
}

function EditUserModal({
  tenantId,
  user,
  onClose,
}: {
  tenantId: string
  user: UserRow
  onClose: () => void
}) {
  const [name, setName] = useState(user.name)
  const [role, setRole] = useState<'ADMIN' | 'BUS_MANAGER'>(
    user.role === 'BUS_MANAGER' ? 'BUS_MANAGER' : 'ADMIN',
  )
  const [error, setError] = useState('')
  const [updateUser, { isLoading }] = useUpdateTenantUserMutation()
  const isSysAdmin = user.role === 'SYSTEM_ADMIN'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await updateUser({ tenantId, userId: user.id, name, role: isSysAdmin ? undefined : role }).unwrap()
      onClose()
    } catch (err: unknown) {
      const message = (err as { data?: { message?: string } })?.data?.message
      setError(typeof message === 'string' ? message : 'Failed to update user')
    }
  }

  return (
    <ModalShell title="Edit User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FieldLabel label="Full Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full h-11 px-4 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all font-medium"
          />
        </FieldLabel>
        {!isSysAdmin && (
          <FieldLabel label="Role">
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
                  {r === 'BUS_MANAGER' ? 'BusManager' : 'Admin'}
                </button>
              ))}
            </div>
          </FieldLabel>
        )}

        {error && (
          <p className="text-sm text-danger-600 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </ModalShell>
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
