# Diccionario de Datos — SREU (SQLite + Prisma ORM, Fase 1 y Fase 2)

Base de datos local: `prisma/dev.db` (Motor: SQLite).
Esquema definido en: `prisma/schema.prisma`.

---

## 1. `Building` (Catálogo de Edificios)
Almacena los 4 edificios académicos de la universidad (`EDIF-1` a `EDIF-4`).

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único del edificio |
| `code` | `TEXT` | `UNIQUE`, `NOT NULL` | Clave corta (`EDIF-1` a `EDIF-4`) |
| `name` | `TEXT` | `UNIQUE`, `NOT NULL` | Nombre administrable (`Edificio 1` a `Edificio 4`) |
| `description` | `TEXT` | `NULL` | Descripción académica del edificio |
| `active` | `BOOLEAN` | `DEFAULT true` | Estado activo en catálogo |
| `isDemo` | `BOOLEAN` | `DEFAULT false` | Indica si pertenece al seed inicial |
| `createdAt` / `updatedAt` | `DATETIME` | `NOT NULL` | Marcas de tiempo |

---

## 2. `User` (Usuarios del Sistema)
Almacena las cuentas de directores, Extensión Universitaria y administradores.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único del usuario |
| `username` | `TEXT` | `UNIQUE`, `NOT NULL` | Nombre de usuario (`director1`..`4`, `extuni`, `admin`) |
| `passwordHash` | `TEXT` | `NOT NULL` | Hash criptográfico `pbkdf2$100000$<salt>$<hash>` |
| `fullName` | `TEXT` | `NOT NULL` | Nombre completo e institucional |
| `email` | `TEXT` | `NULL` | Correo institucional |
| `role` | `TEXT` | `NOT NULL`, `INDEX` | Rol: `SUPER_ADMIN`, `DIRECTOR`, `EXTENSION` |
| `buildingId` | `TEXT` | `FK -> Building.id`, `NULL` | Edificio exclusivo asignado al director |
| `departmentLabel` | `TEXT` | `NULL` | Etiqueta del área o dirección |
| `active` | `BOOLEAN` | `DEFAULT true` | Cuenta activa para iniciar sesión |
| `isDemo` | `BOOLEAN` | `DEFAULT false` | Indica si es cuenta de demostración |

---

## 3. `Space` (Catálogo de Espacios Universitarios)
Almacena los 9 espacios universitarios y su autorizador responsable en base de datos.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único del espacio |
| `code` | `TEXT` | `UNIQUE`, `NOT NULL` | Código único (`AUD-EDIF-1`..`4`, `DOMO`, `EXPLANADA`, `AUD-VINCULACION`, `CANCHA-FUTBOL`, `CANCHA-SOFTBALL`) |
| `name` | `TEXT` | `UNIQUE`, `NOT NULL` | Nombre oficial del espacio |
| `category` | `TEXT` | `NOT NULL` | Categoría: `AUDITORIO`, `EXPLANADA_DOMO`, `DEPORTIVO` |
| `capacity` | `INTEGER` | `DEFAULT 120` | Capacidad estimada de personas |
| `buildingId` | `TEXT` | `FK -> Building.id`, `NULL` | Edificio asociado (para auditorios de edificio) |
| `authorizerType` | `TEXT` | `NOT NULL` | Tipo de autorizador (`DIRECTOR` o `EXTENSION`) |
| `authorizerUserId` | `TEXT` | `FK -> User.id`, `NOT NULL` | Usuario responsable que autoriza este espacio |
| `active` | `BOOLEAN` | `DEFAULT true` | Disponibilidad en catálogo |

---

## 4. `AudienceType` y 5. `EquipmentType` (Catálogos de Criticidad y Equipo)
- `AudienceType`: Niveles 1 al 4 de criticidad (`level`, `name`, `description`, `active`).
- `EquipmentType`: Opciones exclusivas `SOUND` (`Equipo de sonido`) y `FURNITURE` (`Mobiliario`).

---

## 6. `Event` (Eventos Universitarios — Ampliado en Fase 2)
Entidad central que registra el evento, el responsable representado, la criticidad resultante y los metadatos de cierre documental.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único del evento |
| `demoCode` | `TEXT` | `UNIQUE`, `NULL` | Clave de escenario demo (`DEMO-01`..`DEMO-15`, `DEMO-HIST-01`) |
| `isDemo` | `BOOLEAN` | `DEFAULT false` | Identifica registros de demostración |
| `name` / `description` / `justification` | `TEXT` | `NOT NULL` | Datos descriptivos y justificación del evento |
| `date` | `TEXT` | `NOT NULL`, `INDEX` | Fecha del evento (`YYYY-MM-DD`) |
| `startTime` / `endTime` / `cleaningEndTime` | `TEXT` | `NOT NULL` | Horario del evento y fin de la hora obligatoria de limpieza (`+1h`) |
| `startMinutes` / `endMinutes` / `cleaningEndMinutes` | `INTEGER` | `NOT NULL` | Rango en minutos desde medianoche |
| `spaceId` | `TEXT` | `FK -> Space.id`, `NOT NULL` | Espacio solicitado |
| `responsibleName` / `responsibleDepartment` | `TEXT` | `NOT NULL` | Docente o responsable representado y su departamento |
| `responsibleEmail` | `TEXT` | `NULL` | Correo del responsable representado |
| `createdById` | `TEXT` | `FK -> User.id`, `NOT NULL` | Usuario con cuenta que registró el evento |
| `criticalityLevel` | `INTEGER` | `NOT NULL`, `INDEX` | Nivel resultante calculado (`MIN` de niveles seleccionados) |
| `closedAt` | `DATETIME` | `NULL` | Fecha y hora del cierre documental formal (Fase 2; el estado del ciclo de vida se calcula dinámicamente en `src/lib/lifecycle.ts`) |
| `closedById` | `TEXT` | `FK -> User.id`, `NULL` | Usuario que ejecutó el cierre documental (Fase 2) |
| `closureNotes` | `TEXT` | `NULL` | Observaciones de conclusión y cierre del evento (Fase 2) |

---

## 7. `EventAudience`, 8. `SpaceRequest`, 9. `EquipmentRequest`, 10. `EquipmentRequestType`, 11. `ScheduleChangeRequest`, 12. `Reservation`
- `SpaceRequest`: Incluye estados `PENDING`, `APPROVED`, `REJECTED` y **`EXPIRED`** (cuando vence sin autorización al llegar la hora de inicio, registrando `expiredAt`).
- `ScheduleChangeRequest`: Incluye estados `PENDING`, `APPROVED`, `REJECTED` y **`EXPIRED`** (registrando `expiredAt` y manteniendo vigente la reservación original aprobada).
- `Reservation`: Materializa bloqueos `PROVISIONAL`, `APPROVED` y `RELEASED` con +60 min de limpieza.

---

## 13. `EventEvidence` (Metadatos de Evidencias PDF — Ampliado en Fase 2)
Guarda metadatos de los archivos PDF almacenados en `./storage/evidences/`, su categoría documental y trazabilidad de reemplazo excepcional.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `eventId` | `TEXT` | `FK -> Event.id` | Evento al que pertenece el PDF |
| `fileName` / `storedName` / `filePath` | `TEXT` | `NOT NULL` | Nombre original y ruta privada en `./storage/evidences/` |
| `fileSize` | `INTEGER` | `NOT NULL` | Tamaño en bytes |
| `mimeType` | `TEXT` | `DEFAULT 'application/pdf'` | Tipo MIME validado (`%PDF-`) |
| `evidenceType` | `TEXT` | `DEFAULT 'SUPPORTING_DOCUMENT'`, `INDEX` | Categoría: `SUPPORTING_DOCUMENT` o `CLOSURE_EVIDENCE` (Fase 2) |
| `description` | `TEXT` | `NULL` | Descripción opcional del documento (Fase 2) |
| `isArchived` | `BOOLEAN` | `DEFAULT false`, `INDEX` | `true` cuando fue reemplazado excepcionalmente por `SUPER_ADMIN` sin borrarse (Fase 2) |
| `replacedById` | `TEXT` | `NULL` | ID del nuevo `EventEvidence` que sustituyó a este registro (Fase 2) |
| `replacementReason` | `TEXT` | `NULL` | Motivo obligatorio del reemplazo excepcional (Fase 2) |
| `replacedAt` | `DATETIME` | `NULL` | Fecha y hora del reemplazo (Fase 2) |
| `replacedByUserId` | `TEXT` | `FK -> User.id`, `NULL` | Administrador que autorizó el reemplazo (Fase 2) |
| `uploadedById` | `TEXT` | `FK -> User.id` | Usuario que cargó el documento |
| `uploadedAt` | `DATETIME` | `DEFAULT now()` | Fecha y hora de carga |

---

## 14. `Notification` y 15. `AuditLog`
- `Notification`: Avisos internos por usuario y evento (`isRead`, `type`, `link`).
- `AuditLog`: Bitácora inmutable de auditoría con `action`, `entityType`, `entityId`, `summary`, `reason`, `previousData` y `newData`.

---

## 16. `Career` (Catálogo de Carreras Universitarias — Fase 2)
Catálogo administrable por `SUPER_ADMIN` para el registro de alumnos asistentes.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `code` | `TEXT` | `UNIQUE`, `NOT NULL` | Clave de carrera (`IDGS`, `IMEC`, `IIND`, `LINM`, etc.) |
| `name` | `TEXT` | `UNIQUE`, `NOT NULL` | Nombre oficial del programa educativo |
| `buildingId` | `TEXT` | `FK -> Building.id`, `NULL` | Edificio académico asociado |
| `active` | `BOOLEAN` | `DEFAULT true`, `INDEX` | Disponible en formularios de registro |

---

## 17. `AcademicGrade` (Catálogo de Grados / Cuatrimestres — Fase 2)
Catálogo administrable de grados o cuatrimestres asociados opcionalmente a una carrera.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `code` | `TEXT` | `UNIQUE`, `NOT NULL` | Clave única (`CUAT-01`..`CUAT-11`, `IDGS-9A`, etc.) |
| `name` | `TEXT` | `NOT NULL` | Nombre visible (`9° Cuatrimestre`, `9° IDGS - Grupo A`, etc.) |
| `levelOrder` | `INTEGER` | `DEFAULT 1`, `INDEX` | Orden numérico para listados y reportes |
| `careerId` | `TEXT` | `FK -> Career.id`, `NULL` | Carrera específica (o `NULL` si es grado general aplicable a cualquier carrera) |
| `active` | `BOOLEAN` | `DEFAULT true`, `INDEX` | Activo en catálogo |

---

## 18. `DepartmentArea` (Catálogo de Departamentos Académicos y Administrativos — Fase 2)
Catálogo administrable para clasificar a docentes (`ACADEMIC`) y personal administrativo (`ADMINISTRATIVE`).

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `code` | `TEXT` | `UNIQUE`, `NOT NULL` | Clave única (`ACAD-TI`, `ADM-EXT`, etc.) |
| `name` | `TEXT` | `UNIQUE`, `NOT NULL` | Nombre del departamento o coordinación |
| `areaType` | `TEXT` | `DEFAULT 'ACADEMIC'`, `INDEX` | Tipo: `ACADEMIC` (maestros) o `ADMINISTRATIVE` (personal administrativo) |
| `buildingId` | `TEXT` | `FK -> Building.id`, `NULL` | Edificio asociado |
| `active` | `BOOLEAN` | `DEFAULT true`, `INDEX` | Activo en catálogo |

---

## 19. `EventAttendanceConfig` (Configuración de Acceso y Registro por Evento — Fase 2)
Relación `1:1` con `Event` que define si el evento es abierto o restringido, su enlace público y el estado del control de acceso.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `eventId` | `TEXT` | `UNIQUE`, `FK -> Event.id` | Evento configurado |
| `accessType` | `TEXT` | `DEFAULT 'OPEN'`, `INDEX` | `OPEN` (abierto con registro público) o `RESTRICTED` (restringido por invitación) |
| `preRegistrationEnabled` | `BOOLEAN` | `DEFAULT true` | Habilita o pausa el formulario público `/registro/[token]` |
| `publicRegistrationToken` | `TEXT` | `UNIQUE`, `NOT NULL` | Token único para la URL de registro público |
| `registrationOpensAt` / `registrationClosesAt` | `DATETIME` | `NULL` | Ventana opcional de apertura y cierre de inscripciones |
| `maxAttendees` | `INTEGER` | `NULL` | Cupo máximo de registro (por defecto toma la capacidad del espacio) |
| `EstimatedAttendees` | `INTEGER` | `NULL` | Asistencia estimada esperada |
| `requiresInstitutionalEmail` | `BOOLEAN` | `DEFAULT false` | Si exige correo institucional a alumnos/docentes/administrativos |
| `checkInOpen` | `BOOLEAN` | `DEFAULT true` | Estado independiente del control de acceso (abierto/cerrado para escaneo) |
| `checkInClosedAt` | `DATETIME` | `NULL` | Fecha y hora en que se cerró el registro de asistencia |
| `checkInClosedById` | `TEXT` | `FK -> User.id`, `NULL` | Usuario que cerró el control de asistencia |
| `privacyNoticeText` | `TEXT` | `NULL` | Leyenda de privacidad aceptada por los asistentes |

---

## 20. `EventAttendee` (Asistentes e Invitados Registrados — Fase 2)
Almacena tanto los asistentes registrados vía formulario público (`PUBLIC_LINK`) como los invitados capturados manualmente (`MANUAL_INVITE`).

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único del asistente |
| `eventId` | `TEXT` | `FK -> Event.id`, `INDEX` | Evento al que asiste |
| `attendeeType` | `TEXT` | `NOT NULL`, `INDEX` | `STUDENT`, `TEACHER`, `ADMIN_STAFF`, `EXTERNAL_GUEST` |
| `registrationSource` | `TEXT` | `DEFAULT 'PUBLIC_LINK'` | `PUBLIC_LINK` o `MANUAL_INVITE` |
| `status` | `TEXT` | `DEFAULT 'REGISTERED'`, `INDEX` | `REGISTERED` o `CANCELLED` |
| `fullName` | `TEXT` | `NOT NULL` | Nombre completo |
| `email` | `TEXT` | `NOT NULL` | Correo electrónico (único por evento junto con matrícula) |
| `phone` | `TEXT` | `NULL` | Teléfono opcional |
| `enrollmentNumber` | `TEXT` | `NULL` | Matrícula (obligatoria para `STUDENT`, única por evento) |
| `careerId` | `TEXT` | `FK -> Career.id`, `NULL` | Carrera (obligatoria para `STUDENT`) |
| `academicGradeId` | `TEXT` | `FK -> AcademicGrade.id`, `NULL` | Grado/cuatrimestre (obligatorio para `STUDENT`) |
| `departmentAreaId` | `TEXT` | `FK -> DepartmentArea.id`, `NULL` | Departamento académico (`TEACHER`) o administrativo (`ADMIN_STAFF`) |
| `externalCompany` | `TEXT` | `NULL` | Institución u organización opcional (`EXTERNAL_GUEST`) |
| `privacyAccepted` | `BOOLEAN` | `DEFAULT true` | Aceptación del aviso de uso de datos |
| `privacyAcceptedAt` | `DATETIME` | `DEFAULT now()` | Marca de tiempo de aceptación |
| `registeredByUserId` | `TEXT` | `FK -> User.id`, `NULL` | Usuario que lo capturó (cuando es `MANUAL_INVITE`) |

---

## 21. `AttendeeQrCredential` (Credencial QR Individual — Fase 2)
Almacena únicamente el hash `SHA-256` del token criptográfico y la ruta al archivo QR PNG privado de cada asistente. **Nunca almacena el token original en texto plano ni datos personales.**

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `eventAttendeeId` | `TEXT` | `FK -> EventAttendee.id`, `INDEX` | Asistente titular del QR |
| `tokenHash` | `TEXT` | `UNIQUE`, `NOT NULL`, `INDEX` | Hash `SHA-256` del token aleatorio (`sreu_qr_<32 hex>`) para validación sin almacenar texto plano |
| `qrImagePath` | `TEXT` | `NOT NULL` | Nombre de archivo en almacenamiento privado (`./storage/qrs/qr-<id>.png`), con metadato `sreu-qr-hash` y matriz decodificable para pases PDF |
| `isActive` | `BOOLEAN` | `DEFAULT true` | `false` cuando la credencial fue revocada o rotada |
| `createdAt` | `DATETIME` | `DEFAULT now()` | Fecha de emisión |
| `revokedAt` | `DATETIME` | `NULL` | Marca de tiempo de revocación/rotación |
| `expiresAt` | `DATETIME` | `NULL` | Expiración opcional |

**Procedimiento de Rotación e Invalidación de Credenciales QR**:
1. **Cambio de correo antes del ingreso (`!existing.attendance`)**: En `PATCH /api/events/[id]/attendees`, todas las credenciales previas del asistente con `isActive = true` pasan a `isActive = false` y `revokedAt = now()`, se genera un nuevo token criptográfico aleatorio, se almacena únicamente su nuevo `tokenHash`, se genera un nuevo PNG privado en `./storage/qrs/` y se registra `ATTENDEE_EMAIL_CHANGED_QR_REGENERATED` en `AuditLog`.
2. **Revocación de invitación (`action = 'REVOKE'`)**: Cambia `EventAttendee.registrationStatus` a `'REVOKED'`, marca inmediatamente todas sus credenciales activas con `isActive = false, revokedAt = now()`, conserva cualquier entrada histórica (`EventAttendance`) y registra `ATTENDEE_REVOKED` en `AuditLog`.
3. **Cambio de datos no sensibles (nombre, carrera, grado, departamento)**: Conserva la credencial QR vigente sin rotación.

---

## 22. `EventAttendance` (Registro Efectivo de Asistencia / Check-In — Fase 2)
Garantiza mediante `@unique` sobre `eventAttendeeId` que un asistente no pueda registrar entrada duplicada.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `eventId` | `TEXT` | `FK -> Event.id`, `INDEX` | Evento |
| `eventAttendeeId` | `TEXT` | `UNIQUE`, `FK -> EventAttendee.id` | Asistente validado (impide duplicidad) |
| `qrCredentialId` | `TEXT` | `FK -> AttendeeQrCredential.id`, `NULL` | Credencial QR empleada |
| `checkInMethod` | `TEXT` | `DEFAULT 'QR'`, `INDEX` | `QR` (escaneo de código) o `MANUAL` (búsqueda de contingencia) |
| `checkedInAt` | `DATETIME` | `DEFAULT now()`, `INDEX` | Fecha y hora exacta de entrada |
| `checkedInById` | `TEXT` | `FK -> User.id`, `NULL` | Operador o responsable que validó el acceso |
| `notes` | `TEXT` | `NULL` | Observaciones (ej. motivo de contingencia manual) |

---

## 23. `InvitationDelivery` (Trazabilidad de Envío de Invitaciones y Pases QR — Fase 2)
Registra el estado de envío por correo electrónico para cada asistente o invitado.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `eventId` | `TEXT` | `FK -> Event.id`, `INDEX` | Evento |
| `eventAttendeeId` | `TEXT` | `FK -> EventAttendee.id`, `INDEX` | Asistente destinatario |
| `recipientEmail` | `TEXT` | `NOT NULL` | Correo electrónico de destino |
| `status` | `TEXT` | `DEFAULT 'PENDING'`, `INDEX` | `PENDING`, `SENT`, `FAILED` |
| `attemptCount` | `INTEGER` | `DEFAULT 0` | Número de intentos de envío |
| `lastAttemptAt` / `sentAt` | `DATETIME` | `NULL` | Marcas de tiempo del intento y envío exitoso |
| `errorMessage` | `TEXT` | `NULL` | Detalle técnico en caso de `FAILED` o aviso de SMTP no configurado |
| `triggeredById` | `TEXT` | `FK -> User.id`, `NULL` | Usuario que disparó el envío o reenvío |

---

## 24. `EventAccessOperator` (Operadores de Acceso Designados por Evento — Fase 2)
Permite al responsable del evento o al administrador habilitar personal de apoyo para escanear códigos QR en un evento específico.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `eventId` | `TEXT` | `FK -> Event.id`, `INDEX` | Evento autorizado para operar |
| `userId` | `TEXT` | `FK -> User.id`, `INDEX` | Usuario designado como operador de acceso |
| `assignedById` | `TEXT` | `FK -> User.id` | Usuario que otorgó el permiso |
| `active` | `BOOLEAN` | `DEFAULT true` | Permiso vigente |

---

## 25. `AttendanceScanLog` (Bitácora de Intentos de Escaneo QR y Contingencia — Fase 2)
Registra todos los intentos de validación (exitosos, duplicados o rechazados) para auditoría de control de acceso, sin almacenar tokens completos en texto plano.

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `TEXT` | `PK` (`cuid()`) | Identificador único |
| `eventId` | `TEXT` | `FK -> Event.id`, `INDEX` | Evento donde se realizó el escaneo |
| `attendeeId` | `TEXT` | `FK -> EventAttendee.id`, `NULL` | Asistente identificado (si la credencial existe) |
| `operatorId` | `TEXT` | `FK -> User.id`, `INDEX` | Operador que realizó la lectura |
| `attemptedAt` | `DATETIME` | `DEFAULT now()`, `INDEX` | Fecha y hora del intento |
| `result` | `TEXT` | `NOT NULL`, `INDEX` | `AUTHORIZED`, `DUPLICATE`, `REVOKED`, `WRONG_EVENT`, `CHECKIN_CLOSED`, `INVALID_TOKEN` |
| `method` | `TEXT` | `DEFAULT 'QR'` | `QR` o `MANUAL` |
| `details` | `TEXT` | `NULL` | Descripción del resultado del escaneo (sin tokens completos) |
