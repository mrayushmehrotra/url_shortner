import { prismaClient } from "../clients/db";
async function deleteExpiredLinks() {
  const expiredLinks = await prismaClient.link.findMany({
    where: {
      expiry: { lt: new Date() }, // Find links that have expired
    },
  });

  if (expiredLinks.length > 0) {
    await prismaClient.link.deleteMany({
      where: {
        id: { in: expiredLinks.map((link) => link.id) },
      },
    });
  }
}
export { deleteExpiredLinks };
