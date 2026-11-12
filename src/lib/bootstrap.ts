import { prisma } from './prisma';
import { runSeed } from '../../prisma/seed';

let bootstrapPromise: Promise<void> | null = null;
let isBootstrapped = false;

/**
 * Guarantees that if the application is opened for the first time and the SQLite
 * database has not been seeded yet, the initial catalogs, demo accounts, and DEMO-01..DEMO-12
 * scenarios are automatically populated idempotently.
 */
export async function ensureDatabaseSeeded(): Promise<void> {
  if (isBootstrapped) return;
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        await runSeed();
      }
      isBootstrapped = true;
    } catch (err) {
      console.error('Error verifying database seed state:', err);
    } finally {
      bootstrapPromise = null;
    }
  })();

  return bootstrapPromise;
}

