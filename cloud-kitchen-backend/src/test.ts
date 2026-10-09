import { prisma } from "./lib/prisma";

async function main() {
  const users = await prisma.user.findMany();

  console.log("Users:", users);
}

main()
  .catch((error) => {
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });