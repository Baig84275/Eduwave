import "dotenv/config";
import { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/auth/password";

async function main() {
  const seeds: Array<{ email?: string; password?: string; role: Role }> = [
    { email: process.env.SUPER_ADMIN_EMAIL, password: process.env.SUPER_ADMIN_PASSWORD, role: Role.SUPER_ADMIN },
    { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: Role.ADMIN }
  ];

  for (const seed of seeds) {
    if (!seed.email || !seed.password) continue;

    const email = seed.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) continue;

    const passwordHash = await hashPassword(seed.password);
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: seed.role
      }
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
