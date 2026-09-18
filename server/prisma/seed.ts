import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development data...');

  const passwordHash = await argon2.hash('DevPassword123!', {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // 1. Create Users
  const abdullah = await prisma.user.upsert({
    where: { email: 'abdullah@test.nimiq' },
    update: {},
    create: { email: 'abdullah@test.nimiq', passwordHash, displayName: 'Abdullah' },
  });

  const sarah = await prisma.user.upsert({
    where: { email: 'sarah@test.nimiq' },
    update: {},
    create: { email: 'sarah@test.nimiq', passwordHash, displayName: 'Sarah' },
  });

  const michael = await prisma.user.upsert({
    where: { email: 'michael@test.nimiq' },
    update: {},
    create: { email: 'michael@test.nimiq', passwordHash, displayName: 'Michael' },
  });

  const alex = await prisma.user.upsert({
    where: { email: 'alex@test.nimiq' },
    update: {},
    create: { email: 'alex@test.nimiq', passwordHash, displayName: 'Alex' },
  });

  const david = await prisma.user.upsert({
    where: { email: 'david@test.nimiq' },
    update: {},
    create: { email: 'david@test.nimiq', passwordHash, displayName: 'David' },
  });

  console.log('Users created: Abdullah, Sarah, Michael, Alex, David');

  // 2. Create Group
  const groupId = '11111111-1111-1111-1111-111111111111';
  const group = await prisma.group.upsert({
    where: { id: groupId },
    update: {},
    create: {
      id: groupId,
      name: 'Trip to Paris',
      emoji: '✈️',
      description: 'Shared group vault for Paris trip and activities',
      currency: 'USD',
      ownerId: abdullah.id,
    },
  });

  // 3. Add Members
  const memberAbdullah = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: abdullah.id } },
    update: {},
    create: { groupId: group.id, userId: abdullah.id, role: 'OWNER' },
  });

  const memberSarah = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: sarah.id } },
    update: {},
    create: { groupId: group.id, userId: sarah.id, role: 'ADMIN' },
  });

  const memberMichael = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: michael.id } },
    update: {},
    create: { groupId: group.id, userId: michael.id, role: 'MEMBER' },
  });

  const memberAlex = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: alex.id } },
    update: {},
    create: { groupId: group.id, userId: alex.id, role: 'MEMBER' },
  });

  const memberDavid = await prisma.groupMember.upsert({
    where: { groupId_userId: { groupId: group.id, userId: david.id } },
    update: {},
    create: { groupId: group.id, userId: david.id, role: 'MEMBER' },
  });

  // 4. Create Active Goal: $200
  const goalId = '22222222-2222-2222-2222-222222222222';
  const goal = await prisma.goal.upsert({
    where: { id: goalId },
    update: {},
    create: {
      id: goalId,
      groupId: group.id,
      name: 'Trip to Paris',
      targetAmount: 20000n, // $200.00
      currency: 'USD',
      status: 'ACTIVE',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  });

  // 5. Add initial contributions ($40 each for Abdullah, Sarah, Michael = $120 total)
  await prisma.contribution.deleteMany({ where: { goalId: goal.id } });

  await prisma.contribution.create({
    data: {
      goalId: goal.id,
      groupMemberId: memberAbdullah.id,
      amountCents: 4000n,
      note: 'Initial deposit via NIMIQ',
    },
  });

  await prisma.contribution.create({
    data: {
      goalId: goal.id,
      groupMemberId: memberSarah.id,
      amountCents: 4000n,
      note: 'Share payment',
    },
  });

  await prisma.contribution.create({
    data: {
      goalId: goal.id,
      groupMemberId: memberMichael.id,
      amountCents: 4000n,
      note: 'Share payment',
    },
  });

  console.log('Seeded Goal ($200) with $120 collected (Abdullah, Sarah, Michael paid; Alex, David pending)');
  console.log('Seed completed successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
