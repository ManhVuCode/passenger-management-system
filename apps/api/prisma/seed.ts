import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('password123', 10)

  const platformTenant = await prisma.tenant.upsert({
    where: { slug: 'platform' },
    update: {},
    create: {
      name: 'Platform',
      slug: 'platform',
      status: 'ACTIVE',
    },
  })

  const sysadmin = await prisma.user.upsert({
    where: { email: 'sysadmin@platform.com' },
    update: {},
    create: {
      tenantId: platformTenant.id,
      email: 'sysadmin@platform.com',
      passwordHash: hash,
      name: 'System Admin',
      role: 'SYSTEM_ADMIN',
    },
  })

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-tours' },
    update: {},
    create: {
      name: 'Demo Tours',
      slug: 'demo-tours',
      status: 'ACTIVE',
    },
  })

  console.log('Tenant created:', tenant.slug)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@demo.com',
      passwordHash: hash,
      name: 'Demo Admin',
      role: 'ADMIN',
    },
  })

  const busManager = await prisma.user.upsert({
    where: { email: 'driver@demo.com' },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'driver@demo.com',
      passwordHash: hash,
      name: 'Demo Driver',
      role: 'BUS_MANAGER',
    },
  })

  const tenant2 = await prisma.tenant.upsert({
    where: { slug: 'other-tours' },
    update: {},
    create: {
      name: 'Other Tours',
      slug: 'other-tours',
      status: 'ACTIVE',
    },
  })

  await prisma.user.upsert({
    where: { email: 'admin2@other.com' },
    update: {},
    create: {
      tenantId: tenant2.id,
      email: 'admin2@other.com',
      passwordHash: hash,
      name: 'Other Admin',
      role: 'ADMIN',
    },
  })

  console.log('Seed complete')
  console.log('SystemAdmin:', sysadmin.email, '/ password: password123')
  console.log('Admin:', admin.email, '/ password: password123')
  console.log('Driver:', busManager.email, '/ password: password123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
