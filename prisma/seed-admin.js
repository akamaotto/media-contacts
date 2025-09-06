const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

(async () => {
  const prisma = new PrismaClient();
  const email = 'akamaotto@gmail.com';
  const tempPassword = 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  await prisma.users.upsert({
    where: { email },
    update: { role: 'ADMIN', hashedPassword, updatedAt: new Date() },
    create: { id: randomUUID(), email, name: 'Super Admin', role: 'ADMIN', hashedPassword, updatedAt: new Date() },
  });

  console.log(`✅ Super admin ensured: ${email} (temporary password: ${tempPassword})`);
  await prisma.$disconnect();
})();
