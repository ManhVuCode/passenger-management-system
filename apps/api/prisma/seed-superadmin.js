// Production bootstrap: create ONE SYSTEM_ADMIN if it does not already exist.
// Credentials come from env (SEED_SUPERADMIN_EMAIL / SEED_SUPERADMIN_PASSWORD)
// so no password is hardcoded in the repo. Idempotent: skips if the user
// exists (never overwrites a password changed later via the app). Runs inside
// the Railway container right after `prisma migrate deploy`.
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_SUPERADMIN_EMAIL
  const password = process.env.SEED_SUPERADMIN_PASSWORD
  if (!email || !password) {
    console.log('[seed] SEED_SUPERADMIN_EMAIL/PASSWORD not set — skipping superadmin seed')
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`[seed] superadmin "${email}" already exists — skipping`)
    return
  }

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'system' },
    update: {},
    create: { name: 'System', slug: 'system', status: 'ACTIVE' },
  })

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      name: 'Super Admin',
      role: 'SYSTEM_ADMIN',
    },
  })

  console.log(`[seed] superadmin "${email}" created (tenant: ${tenant.slug})`)
}

main()
  .catch((e) => console.error('[seed] error (ignored, app will still start):', e))
  .finally(() => prisma.$disconnect())
