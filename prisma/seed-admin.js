const { PrismaClient, Role } = require('@prisma/client');
const bcrypt = require('bcryptjs');

(async () => {
  const prisma = new PrismaClient();
  const email = 'akamaotto@gmail.com';
  const tempPassword = 'ChangeMe123!';
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', hashedPassword },
    create: { email, name: 'Super Admin', role: 'ADMIN', hashedPassword },
  });

  console.log(`✅ Super admin ensured: ${email} (temporary password: ${tempPassword})`);
  await prisma.$disconnect();
})();
