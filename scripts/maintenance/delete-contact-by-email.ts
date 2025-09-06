import { prisma } from '@/lib/database/prisma';

function getArgValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(`--${flag}`);
  if (idx !== -1 && process.argv[idx + 1] && !process.argv[idx + 1].startsWith('--')) {
    return process.argv[idx + 1];
  }
  return undefined;
}

async function main() {
  const email = getArgValue('email');
  if (!email) {
    console.error('Usage: tsx scripts/maintenance/delete-contact-by-email.ts --email someone@example.com');
    process.exit(1);
  }

  const contact = await prisma.media_contacts.findUnique({ where: { email } });
  if (!contact) {
    console.log(`[Delete] No media contact found with email: ${email}`);
    return;
  }

  await prisma.media_contacts.delete({ where: { id: contact.id } });
  console.log(`[Delete] Removed media contact id=${contact.id} email=${email}`);
}

main()
  .catch((e) => {
    console.error('[Delete] Unhandled error:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
