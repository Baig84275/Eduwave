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

  const demoCourses = [
    {
      title: "EduWave Facilitator Training",
      levelNumber: 1,
      description: "Foundations",
      learnworldsUrl: "https://learnworlds.com",
      active: true,
      modules: [
        { moduleName: "Module A", lmsUrl: "https://learnworlds.com" },
        { moduleName: "Module B", lmsUrl: "https://learnworlds.com" }
      ]
    },
    {
      title: "EduWave Facilitator Training",
      levelNumber: 2,
      description: "Advanced Support",
      learnworldsUrl: "https://learnworlds.com",
      active: true,
      modules: [
        { moduleName: "Module A", lmsUrl: "https://learnworlds.com" },
        { moduleName: "Module B", lmsUrl: "https://learnworlds.com" }
      ]
    }
  ];

  for (const c of demoCourses) {
    const course = await prisma.trainingCourse.upsert({
      where: { id: `${c.title.replace(/\s+/g, "-").toLowerCase()}-level-${c.levelNumber}` },
      create: {
        id: `${c.title.replace(/\s+/g, "-").toLowerCase()}-level-${c.levelNumber}`,
        title: c.title,
        levelNumber: c.levelNumber,
        description: c.description,
        learnworldsUrl: c.learnworldsUrl,
        active: c.active
      },
      update: {
        title: c.title,
        description: c.description,
        learnworldsUrl: c.learnworldsUrl,
        active: c.active
      },
      select: { id: true }
    });

    for (const m of c.modules) {
      await prisma.trainingModule.upsert({
        where: { courseId_moduleName: { courseId: course.id, moduleName: m.moduleName } },
        create: { courseId: course.id, moduleName: m.moduleName, lmsUrl: m.lmsUrl },
        update: { lmsUrl: m.lmsUrl }
      });
    }
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
