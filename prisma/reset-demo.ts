import { PrismaClient } from '@prisma/client';
import { runSeed } from './seed';

const prisma = new PrismaClient();

async function resetDemoData() {
  if (process.env.CONFIRM_DEMO_RESET !== 'true') {
    console.error(
      '⚠️ Operación cancelada. Para reinicializar exclusivamente los datos DEMO debe definir CONFIRM_DEMO_RESET=true.'
    );
    console.error('Ejemplo (PowerShell): $env:CONFIRM_DEMO_RESET="true"; npm run db:reset-demo');
    process.exit(1);
  }

  console.log('🔄 Eliminando exclusivamente eventos, notificaciones y bitácoras de demostración (isDemo = true)...');

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({
      where: {
        OR: [{ isDemo: true }, { event: { isDemo: true } }],
      },
    });

    await tx.auditLog.deleteMany({
      where: {
        OR: [{ isDemo: true }, { event: { isDemo: true } }],
      },
    });

    await tx.eventEvidence.deleteMany({
      where: {
        OR: [{ isDemo: true }, { event: { isDemo: true } }],
      },
    });

    // Al eliminar los eventos con isDemo = true, Prisma elimina en cascada sus SpaceRequest,
    // EquipmentRequest, ScheduleChangeRequest, Reservation y EventAudience.
    const deletedEvents = await tx.event.deleteMany({
      where: {
        OR: [{ isDemo: true }, { demoCode: { not: null } }],
      },
    });

    console.log(`🗑️ Eventos de demostración eliminados: ${deletedEvents.count} (registros reales preservados).`);
  });

  await runSeed();
}

resetDemoData()
  .catch((err) => {
    console.error('❌ Error al reinicializar datos DEMO:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

