import { PrismaClient } from '@prisma/client';
// Use READ_DATABASE_URL if provided, otherwise fall back to primary DATABASE_URL
const url = process.env.READ_DATABASE_URL || process.env.DATABASE_URL!;
export const prismaRO = new PrismaClient({ datasources: { db: { url } } });
