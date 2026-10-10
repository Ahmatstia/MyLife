import { prisma } from "@/lib/prisma";
import type { SupportResource } from "@/generated/prisma/client";
import { VERIFIED_SUPPORT_RESOURCES } from "@/lib/habits/safety/resources.seed";

export async function findSupportResources(filter?: {
  country?: string;
  category?: string;
}): Promise<SupportResource[]> {
  // Pastikan seed data ada jika tabel masih kosong
  const count = await prisma.supportResource.count();
  if (count === 0) {
    await prisma.supportResource.createMany({
      data: VERIFIED_SUPPORT_RESOURCES.map((r) => ({
        country: r.country,
        category: r.category,
        name: r.name,
        contact: r.contact,
        description: r.description,
        sourceUrl: r.sourceUrl,
        isVerified: true,
        verifiedAt: r.verifiedAt,
      })),
      skipDuplicates: true,
    });
  }

  return prisma.supportResource.findMany({
    where: {
      isVerified: true,
      ...(filter?.country ? { country: filter.country.toUpperCase() } : {}),
      ...(filter?.category ? { category: filter.category.toUpperCase() } : {}),
    },
    orderBy: { createdAt: "asc" },
  });
}
