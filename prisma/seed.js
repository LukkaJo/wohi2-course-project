const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const prisma = new PrismaClient();

async function main() {
  await prisma.post.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "admin@example.com",
      password: hashedPassword,
      name: "Admin User",
    },
  });

  console.log("Created user:", user.email);

  const seedPosts = [
    {
      title: "Introduction to HTTP",
      date: new Date("2026-03-20"),
      content: "HTTP is the foundation of communication on the web.",
      keywords: ["http", "web"],
    },
    {
      title: "Understanding REST APIs",
      date: new Date("2026-03-22"),
      content: "REST is an architectural style that uses standard HTTP methods.",
      keywords: ["http", "api"],
    },
    {
      title: "Node.js Basics",
      date: new Date("2026-03-25"),
      content: "Node.js allows you to run JavaScript on the server.",
      keywords: ["javascript", "backend"],
    },
    {
      title: "Introduction to Databases",
      date: new Date("2026-03-26"),
      content: "Databases store and organize data.",
      keywords: ["database", "backend"],
    },
  ];

  for (const post of seedPosts) {
    await prisma.post.create({
      data: {
        title: post.title,
        date: post.date,
        content: post.content,
        userId: user.id,
        keywords: {
          connectOrCreate: post.keywords.map((kw) => ({
            where: { name: kw },
            create: { name: kw },
          })),
        },
      },
    });
  }

  console.log("Seed data inserted successfully");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });