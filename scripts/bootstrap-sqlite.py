import os
import secrets
import sqlite3
import hashlib
import json
from datetime import datetime, timedelta, timezone

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(ROOT_DIR, "prisma", "dev.db")
MIGRATION_SQL_PATH = os.path.join(
    ROOT_DIR, "prisma", "migrations", "20261112000000_init", "migration.sql"
)
STORAGE_DIR = os.path.join(ROOT_DIR, "storage", "evidences")


def hash_password(plain: str, salt: str) -> str:
    dk = hashlib.pbkdf2_hmac(
        "sha512", plain.encode("utf-8"), salt.encode("utf-8"), 100000, 64
    ).hex()
    return f"pbkdf2$100000${salt}${dk}"


def time_to_minutes(t: str) -> int:
    h, m = map(int, t.split(":"))
    return h * 60 + m


def minutes_to_time(mins: int) -> str:
    h = mins // 60
    m = mins % 60
    return f"{h:02d}:{m:02d}"


def generate_pdf_bytes(
    event_code: str,
    title: str,
    subtitle: str,
    space_name: str,
    responsible_name: str,
    department: str,
    body_lines: list[str],
) -> bytes:
    lines = [
        "UNIVERSIDAD TECNOLOGICA - SISTEMA DE RESERVACION DE ESPACIOS (SREU)",
        "====================================================================",
        f"DOCUMENTO DE EVIDENCIA OFICIAL: {event_code}",
        f"TITULO: {title}",
        f"SUBTITULO: {subtitle}",
        f"ESPACIO SOLICITADO: {space_name}",
        f"RESPONSABLE DEL EVENTO: {responsible_name}",
        f"DEPARTAMENTO / AREA: {department}",
        "--------------------------------------------------------------------",
        *body_lines,
        "--------------------------------------------------------------------",
        "Documento de demostracion generado para validacion academica SREU.",
    ]

    cmds = ["BT", "/F1 11 Tf", "50 750 Td", "15 TL"]
    for idx, line in enumerate(lines):
        if idx == 0:
            cmds.append(f"({line}) Tj")
        else:
            cmds.append(f"T* ({line}) Tj")
    cmds.append("ET")
    stream_content = "\n".join(cmds) + "\n"

    objects = [
        "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
        f"4 0 obj\n<< /Length {len(stream_content.encode('ascii'))} >>\nstream\n{stream_content}endstream\nendobj\n",
        "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    ]

    pdf = "%PDF-1.4\n"
    offsets = [0]
    for obj in objects:
        offsets.append(len(pdf.encode("ascii")))
        pdf += obj

    xref_offset = len(pdf.encode("ascii"))
    pdf += f"xref\n0 {len(objects) + 1}\n"
    pdf += "0000000000 65535 f \n"
    for i in range(1, len(objects) + 1):
        pdf += f"{offsets[i]:010d} 00000 n \n"
    pdf += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"
    return pdf.encode("ascii")


def main():
    os.makedirs(STORAGE_DIR, exist_ok=True)
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0:
        conn = sqlite3.connect(DB_PATH)
        cur = conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
        tables = [r[0] for r in cur.fetchall()]
        print(f"Base de datos SQLite existente respetada en: {DB_PATH}")
        print(f"Tablas encontradas ({len(tables)}): {', '.join(tables)}")
        conn.close()
        return

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    with open(MIGRATION_SQL_PATH, "r", encoding="utf-8") as f:
        migration_sql = f.read()
    cur.executescript(migration_sql)

    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    # Reference date in America/Monterrey (UTC-6)
    mty_now = datetime.now(timezone(timedelta(hours=-6)))
    base_date = mty_now.date()

    # 1. Buildings
    buildings = [
        ("bldg-1", "EDIF-1", "Edificio 1", "Docencia e Ingeniería Aplicada - Edificio 1"),
        ("bldg-2", "EDIF-2", "Edificio 2", "Tecnologías de la Información y Sistemas - Edificio 2"),
        ("bldg-3", "EDIF-3", "Edificio 3", "Ciencias Económico-Administrativas - Edificio 3"),
        ("bldg-4", "EDIF-4", "Edificio 4", "Procesos Industriales y Mecatrónica - Edificio 4"),
    ]
    for bid, code, name, desc in buildings:
        cur.execute(
            'INSERT INTO "Building" ("id","code","name","description","active","isDemo","createdAt","updatedAt") VALUES (?,?,?,?,1,1,?,?)',
            (bid, code, name, desc, now_iso, now_iso),
        )

    # 2. Users
    def get_seed_password(env_key: str) -> str:
        val = os.environ.get(env_key, "").strip() or os.environ.get("SEED_DEFAULT_PASSWORD", "").strip()
        return val if val else secrets.token_urlsafe(12)

    users = [
        (
            "usr-director1",
            "director1",
            hash_password(get_seed_password("SEED_DIRECTOR1_PASSWORD"), "a1b2c3d4e5f60101a1b2c3d4e5f60101"),
            "Dr. Roberto Méndez Garza (Director Edificio 1)",
            "director1@utc.edu.mx",
            "DIRECTOR",
            "bldg-1",
            "Dirección Edificio 1",
        ),
        (
            "usr-director2",
            "director2",
            hash_password(get_seed_password("SEED_DIRECTOR2_PASSWORD"), "a1b2c3d4e5f60202a1b2c3d4e5f60202"),
            "Dra. Laura Patricia Treviño (Directora Edificio 2)",
            "director2@utc.edu.mx",
            "DIRECTOR",
            "bldg-2",
            "Dirección Edificio 2",
        ),
        (
            "usr-director3",
            "director3",
            hash_password(get_seed_password("SEED_DIRECTOR3_PASSWORD"), "a1b2c3d4e5f60303a1b2c3d4e5f60303"),
            "Mtro. Carlos Eduardo Villarreal (Director Edificio 3)",
            "director3@utc.edu.mx",
            "DIRECTOR",
            "bldg-3",
            "Dirección Edificio 3",
        ),
        (
            "usr-director4",
            "director4",
            hash_password(get_seed_password("SEED_DIRECTOR4_PASSWORD"), "a1b2c3d4e5f60404a1b2c3d4e5f60404"),
            "Mtra. Sofía Alejandra Cantú (Directora Edificio 4)",
            "director4@utc.edu.mx",
            "DIRECTOR",
            "bldg-4",
            "Dirección Edificio 4",
        ),
        (
            "usr-extuni",
            "extuni",
            hash_password(get_seed_password("SEED_EXTENSION_PASSWORD"), "a1b2c3d4e5f60505a1b2c3d4e5f60505"),
            "Lic. Fernando Elizondo (Extensión Universitaria)",
            "extension@utc.edu.mx",
            "EXTENSION",
            None,
            "Extensión Universitaria",
        ),
        (
            "usr-admin",
            "admin",
            hash_password(get_seed_password("SEED_ADMIN_PASSWORD"), "a1b2c3d4e5f60606a1b2c3d4e5f60606"),
            "Ing. Administrador General SREU",
            "admin.sreu@utc.edu.mx",
            "SUPER_ADMIN",
            None,
            "Administración General de Sistemas",
        ),
    ]
    user_map = {}
    for uid, uname, phash, fname, email, role, bid, dept in users:
        cur.execute(
            'INSERT INTO "User" ("id","username","passwordHash","fullName","email","role","buildingId","departmentLabel","active","isDemo","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,1,1,?,?)',
            (uid, uname, phash, fname, email, role, bid, dept, now_iso, now_iso),
        )
        user_map[uname] = {"id": uid, "username": uname, "fullName": fname}

    # 3. Spaces
    spaces = [
        ("spc-aud-1", "AUD-EDIF-1", "Auditorio Edificio 1", "AUDITORIO", 150, "Planta Baja - Edificio 1", "bldg-1", "DIRECTOR", "usr-director1"),
        ("spc-aud-2", "AUD-EDIF-2", "Auditorio Edificio 2", "AUDITORIO", 150, "Planta Baja - Edificio 2", "bldg-2", "DIRECTOR", "usr-director2"),
        ("spc-aud-3", "AUD-EDIF-3", "Auditorio Edificio 3", "AUDITORIO", 140, "Planta Baja - Edificio 3", "bldg-3", "DIRECTOR", "usr-director3"),
        ("spc-aud-4", "AUD-EDIF-4", "Auditorio Edificio 4", "AUDITORIO", 140, "Planta Baja - Edificio 4", "bldg-4", "DIRECTOR", "usr-director4"),
        ("spc-domo", "DOMO", "Domo", "EXPLANADA_DOMO", 600, "Plaza Central Universitaria", None, "EXTENSION", "usr-extuni"),
        ("spc-explanada", "EXPLANADA", "Explanada", "EXPLANADA_DOMO", 800, "Explanada Cívica Principal", None, "EXTENSION", "usr-extuni"),
        ("spc-aud-vinc", "AUD-VINCULACION", "Auditorio Vinculación", "AUDITORIO", 280, "Centro de Vinculación Universitaria", None, "EXTENSION", "usr-extuni"),
        ("spc-futbol", "CANCHA-FUTBOL", "Cancha de fútbol", "DEPORTIVO", 400, "Complejo Deportivo Norte", None, "EXTENSION", "usr-extuni"),
        ("spc-softball", "CANCHA-SOFTBALL", "Cancha de softball", "DEPORTIVO", 300, "Complejo Deportivo Sur", None, "EXTENSION", "usr-extuni"),
    ]
    space_map = {}
    for sid, scode, sname, cat, cap, loc, bid, atype, auid in spaces:
        cur.execute(
            'INSERT INTO "Space" ("id","code","name","category","capacity","location","buildingId","authorizerType","authorizerUserId","active","isDemo","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,1,1,?,?)',
            (sid, scode, sname, cat, cap, loc, bid, atype, auid, now_iso, now_iso),
        )
        space_map[sname] = {"id": sid, "name": sname, "authorizerUserId": auid}

    # 4. AudienceType
    audiences = [
        ("aud-1", 1, "Asiste rector", "Eventos protocolarios e institucionales con presencia del Rector."),
        ("aud-2", 2, "Asisten autoridades", "Eventos con participación de directivos, secretarios o autoridades externas."),
        ("aud-3", 3, "Invitados especiales", "Conferencias, foros o paneles con ponentes invitados y representantes empresariales."),
        ("aud-4", 4, "Solo alumnos y docentes", "Actividades académicas, tutorías, talleres y eventos internos de la comunidad."),
    ]
    aud_map = {}
    for aid, lvl, name, desc in audiences:
        cur.execute(
            'INSERT INTO "AudienceType" ("id","level","name","description","active","isDemo","createdAt","updatedAt") VALUES (?,?,?,?,1,1,?,?)',
            (aid, lvl, name, desc, now_iso, now_iso),
        )
        aud_map[lvl] = {"id": aid, "level": lvl, "name": name}

    # 5. EquipmentType
    equip_types = [
        ("eq-sound", "SOUND", "Equipo de sonido", "Bocinas, consola de audio, micrófonos inalámbricos y pedestal."),
        ("eq-furn", "FURNITURE", "Mobiliario", "Mesas de presídium, tablones, sillas plegables, pódium y mantelería institucional."),
    ]
    eq_map = {}
    for eid, code, name, desc in equip_types:
        cur.execute(
            'INSERT INTO "EquipmentType" ("id","code","name","description","active","isDemo","createdAt","updatedAt") VALUES (?,?,?,?,1,1,?,?)',
            (eid, code, name, desc, now_iso, now_iso),
        )
        eq_map[code] = {"id": eid, "code": code, "name": name}

    # 6. Write Demo PDFs
    pdf_defs = {
        "DEMO-02": {
            "fileName": "Programa_Jornada_Innovacion_DEMO02.pdf",
            "storedName": "demo-02-programa-innovacion.pdf",
            "title": "Jornada de Innovacion Tecnologica UTC",
            "subtitle": "Orden del dia y ficha tecnica del evento",
            "spaceName": "Auditorio Edificio 2",
            "responsibleName": "Mtro. Jorge Luis Garza Sepulveda",
            "department": "Academia de Ingenieria en Desarrollo y Gestion de Software",
            "lines": [
                "1. Registro de participantes y bienvenida institucional (09:00 - 09:20)",
                "2. Mensaje inaugural con presencia de Rectoria e invitados (09:20 - 09:45)",
                "3. Presentacion de proyectos integradores de innovacion (09:45 - 10:30)",
                "4. Panel de retroalimentacion tecnologica y clausura (10:30 - 11:00)",
                "5. Periodo obligatorio de limpieza del recinto (11:00 - 12:00)",
                "Requerimiento adicional: Equipo de sonido con 3 microfonos inalambricos.",
            ],
        },
        "DEMO-06": {
            "fileName": "Oficio_Solicitud_Feria_Estudiantil_DEMO06.pdf",
            "storedName": "demo-06-oficio-feria-estudiantil.pdf",
            "title": "Feria Estudiantil de Proyectos y Clubes",
            "subtitle": "Oficio de autorizacion y croquis de montaje",
            "spaceName": "Explanada",
            "responsibleName": "Lic. Mariana Cepeda Flores",
            "department": "Coordinacion de Tutorias y Vida Estudiantil - Edificio 2",
            "lines": [
                "Por medio del presente documento se adjunta la logistica de montaje",
                "para la Feria Estudiantil en la Explanada Principal.",
                "- Horario del evento: 09:00 a 12:00 hrs.",
                "- Hora obligatoria de limpieza posterior: 12:00 a 13:00 hrs.",
                "- Mobiliario autorizado por Extension Universitaria: 15 tablones y 60 sillas.",
            ],
        },
        "DEMO-11": {
            "fileName": "Programa_Capacitacion_Institucional_DEMO11.pdf",
            "storedName": "demo-11-programa-capacitacion.pdf",
            "title": "Capacitacion Institucional Docente",
            "subtitle": "Cronograma de sesion matutina",
            "spaceName": "Auditorio Edificio 1",
            "responsibleName": "Dra. Elena Morales Cavazos",
            "department": "Coordinacion Pedagogica Edificio 1",
            "lines": [
                "Sesion intensiva de actualizacion en modelo educativo por competencias.",
                "- Horario reservado: 09:00 a 10:00 hrs.",
                "- Hora de limpieza reservada automaticamente: 10:00 a 11:00 hrs.",
                "- Nota: Permite el inicio puntual del Encuentro de Estudiantes (DEMO-12) a las 11:00 hrs.",
            ],
        },
    }

    written_pdfs = {}
    for code, meta in pdf_defs.items():
        buf = generate_pdf_bytes(
            code,
            meta["title"],
            meta["subtitle"],
            meta["spaceName"],
            meta["responsibleName"],
            meta["department"],
            meta["lines"],
        )
        fpath = os.path.join(STORAGE_DIR, meta["storedName"])
        with open(fpath, "wb") as pf:
            pf.write(buf)
        written_pdfs[code] = {
            "fileName": meta["fileName"],
            "storedName": meta["storedName"],
            "fileSize": len(buf),
        }

    # 7. Demo Events (DEMO-01 .. DEMO-12 + DEMO-HIST-01)
    scenarios = [
        ("ev-demo-01", "DEMO-01", "Conferencia de bienvenida", "Sesión magistral de bienvenida para alumnos de nuevo ingreso y presentación de lineamientos académicos del cuatrimestre.", "Integrar a los estudiantes de nuevo ingreso con las autoridades académicas e invitados del sector productivo.", 2, "10:00", "12:00", "Auditorio Edificio 1", "director2", "Mtro. Alejandro Domínguez Peña", "Coordinación de Ingreso y Tutoría - Edificio 2", "a.dominguez@utc.edu.mx", [2, 3], "PENDING", None, None, None, None, None, None),
        ("ev-demo-02", "DEMO-02", "Jornada de innovación", "Exposición de prototipos tecnológicos, desarrollo de software e inteligencia artificial aplicada a la industria regional.", "Evaluación colegiada de proyectos integradores con presencia del Rector y evaluadores invitados de la industria.", 3, "09:00", "11:00", "Auditorio Edificio 2", "director1", "Mtro. Jorge Luis Garza Sepúlveda", "Academia de Ingeniería en Desarrollo y Gestión de Software", "j.garza@utc.edu.mx", [1, 3], "APPROVED", None, ["SOUND"], "Se solicita consola de sonido principal, 3 micrófonos inalámbricos de mano, 1 micrófono de solapa para conferencista y conexión de audio para proyección HDMI.", "PENDING", None, None),
        ("ev-demo-03", "DEMO-03", "Feria de actividades universitarias", "Muestra interactiva de talleres culturales, clubes de robótica, emprendimiento y grupos representativos.", "Fomentar la formación integral de los estudiantes mediante su incorporación a talleres extracurriculares.", 4, "10:00", "13:00", "Domo", "director3", "Lic. Valeria Montemayor Ríos", "Coordinación de Desarrollo Estudiantil - Edificio 3", "v.montemayor@utc.edu.mx", [3, 4], "PENDING", None, ["FURNITURE"], "Se solicitan 20 tablones rectangulares con mantelería institucional, 80 sillas plegables y 1 pódium para el acto inaugural.", "PENDING", None, None),
        ("ev-demo-04", "DEMO-04", "Encuentro académico", "Mesa de trabajo interdisciplinaria entre cuerpos académicos para revisión de planes de estudio.", "Reunión de seguimiento departamental para actualización bibliográfica.", 5, "11:00", "13:00", "Auditorio Edificio 3", "director2", "Dr. Héctor Javier Lozano", "Cuerpo Académico de Sistemas Computacionales - Edificio 2", "h.lozano@utc.edu.mx", [2, 4], "REJECTED", "Se requiere corregir la justificación y confirmar la disponibilidad institucional para la fecha solicitada", None, None, None, None, None),
        ("ev-demo-05", "DEMO-05", "Reunión de academias", "Sesión plenaria de docentes para homologación de criterios de evaluación e instrumentos rúbricos.", "Cumplimiento del calendario de planeación académica cuatrimestral de profesores de tiempo completo y asignatura.", 5, "09:00", "11:00", "Auditorio Edificio 4", "director1", "Mtra. Claudia Berenice Saldaña", "Jefatura de Materias Básicas e Ingeniería - Edificio 1", "c.saldana@utc.edu.mx", [4], "PENDING", None, None, None, None, None, None),
        ("ev-demo-06", "DEMO-06", "Feria estudiantil", "Exposición abierta de proyectos de emprendimiento social y sustentabilidad desarrollados por alumnos.", "Promover las competencias de liderazgo y trabajo colaborativo en la comunidad estudiantil.", 6, "09:00", "12:00", "Explanada", "director2", "Lic. Mariana Cepeda Flores", "Coordinación de Tutorías y Vida Estudiantil - Edificio 2", "m.cepeda@utc.edu.mx", [4], "APPROVED", None, ["FURNITURE"], "15 mesas tipo tablón para stands estudiantiles, 60 sillas plegables y mamparas de señalización.", "APPROVED", None, None),
        ("ev-demo-07", "DEMO-07", "Conferencia de invitados", "Conferencia magistral sobre transformación digital e Industria 4.0 con directivos del clúster industrial.", "Fortalecer la vinculación universidad-empresa con asistencia del Rector y directores de área.", 7, "10:00", "12:00", "Auditorio Vinculación", "director4", "Ing. Ricardo Tamez Guajardo", "Academia de Mecatrónica y Automatización - Edificio 4", "r.tamez@utc.edu.mx", [1, 2], "PENDING", None, None, None, None, None, None),
        ("ev-demo-08", "DEMO-08", "Torneo deportivo universitario", "Jornada inaugural y fase eliminatoria del torneo inter-carreras de fútbol soccer.", "Impulsar la activación física, el deporte universitario y la sana convivencia entre programas educativos.", 8, "08:00", "11:00", "Cancha de fútbol", "director3", "Prof. Arturo Galván Escobedo", "Promoción Deportiva - Edificio 3", "a.galvan@utc.edu.mx", [3, 4], "APPROVED", None, None, None, None, None, None),
        ("ev-demo-09", "DEMO-09", "Clínica deportiva", "Taller práctico de fundamentos técnicos y arbitraje de softball para selecciones representativas.", "Preparación técnica del selectivo universitario previo al encuentro regional.", 9, "09:00", "11:00", "Cancha de softball", "director4", "Entrenador Daniel Rodríguez Saucedo", "Actividades Deportivas - Edificio 4", "d.rodriguez@utc.edu.mx", [4], "APPROVED", None, ["SOUND"], "Sistema de perifoneo exterior de alta potencia y 2 micrófonos inalámbricos en campo.", "REJECTED", "No es posible proporcionar el equipo solicitado en la fecha indicada", None),
        ("ev-demo-10", "DEMO-10", "Muestra cultural", "Presentación de ensamble musical, danza folklórica y exposición fotográfica universitaria.", "Difusión cultural institucional con participación de autoridades académicas e invitados especiales.", 1, "09:00", "10:00", "Domo", "director1", "Mtra. Gabriela Chapa Elizondo", "Difusión Cultural - Edificio 1", "g.chapa@utc.edu.mx", [2, 3, 4], "APPROVED", None, ["SOUND", "FURNITURE"], "Sonido ambiental para ensamble acústico, 4 micrófonos con pedestal y 40 sillas para zona de invitados.", "APPROVED", None, ("13:00", "14:00", "Se solicita mover el horario de 09:00-10:00 a 13:00-14:00 para facilitar la asistencia del turno vespertino y el montaje escénico.")),
        ("ev-demo-11", "DEMO-11", "Capacitación institucional", "Curso-taller sobre actualización de estrategias didácticas y evaluación por competencias.", "Capacitación obligatoria del personal docente del Edificio 1 con presencia de autoridades académicas.", 1, "09:00", "10:00", "Auditorio Edificio 1", "director1", "Dra. Elena Morales Cavazos", "Coordinación Pedagógica - Edificio 1", "e.morales@utc.edu.mx", [2, 4], "APPROVED", None, ["SOUND", "FURNITURE"], "2 micrófonos inalámbricos para ponentes y mesa de presídium para 4 personas.", "APPROVED", None, None),
        ("ev-demo-12", "DEMO-12", "Encuentro de estudiantes", "Foro de intercambio de experiencias de estadías profesionales y servicio social.", "Orientar a los alumnos próximos a iniciar su periodo de estadía empresarial, respetando la hora de limpieza de 10:00 a 11:00 posterior a DEMO-11.", 1, "11:00", "12:00", "Auditorio Edificio 1", "director3", "Mtro. Raúl Quintanilla Zertuche", "Coordinación de Estadías - Edificio 3", "r.quintanilla@utc.edu.mx", [4], "APPROVED", None, None, None, None, None, None),
        ("ev-demo-hist-01", "DEMO-HIST-01", "Coloquio de Investigación Universitaria", "Presentación de resultados de proyectos de investigación aplicada del periodo anterior.", "Evento histórico registrado para validación de consultas y exportación CSV en el módulo de Reportes.", -5, "10:00", "12:00", "Auditorio Vinculación", "director1", "Dr. Esteban Garza Villarreal", "Posgrado e Investigación - Edificio 1", "e.garza@utc.edu.mx", [1, 2, 3], "APPROVED", None, ["SOUND"], "Equipo de audio de sala y micrófono de pódium.", "APPROVED", None, None),
    ]

    for (
        ev_id,
        demo_code,
        name,
        desc,
        justif,
        day_offset,
        start_t,
        end_t,
        space_name,
        creator_uname,
        resp_name,
        resp_dept,
        resp_email,
        aud_levels,
        sp_status,
        sp_rej_reason,
        eq_codes,
        eq_desc,
        eq_status,
        eq_rej_reason,
        sched_change,
    ) in scenarios:
        ev_date = (base_date + timedelta(days=day_offset)).strftime("%Y-%m-%d")
        s_mins = time_to_minutes(start_t)
        e_mins = time_to_minutes(end_t)
        c_mins = e_mins + 60
        c_time = minutes_to_time(c_mins)
        crit_lvl = min(aud_levels)

        sp = space_map[space_name]
        creator = user_map[creator_uname]
        extuni = user_map["extuni"]

        cur.execute(
            'INSERT INTO "Event" ("id","demoCode","isDemo","name","description","justification","date","startTime","endTime","cleaningEndTime","startMinutes","endMinutes","cleaningEndMinutes","spaceId","responsibleName","responsibleDepartment","responsibleEmail","createdById","criticalityLevel","createdAt","updatedAt") VALUES (?,?,1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
            (
                ev_id,
                demo_code,
                name,
                desc,
                justif,
                ev_date,
                start_t,
                end_t,
                c_time,
                s_mins,
                e_mins,
                c_mins,
                sp["id"],
                resp_name,
                resp_dept,
                resp_email,
                creator["id"],
                crit_lvl,
                now_iso,
                now_iso,
            ),
        )

        for lvl in aud_levels:
            cur.execute(
                'INSERT INTO "EventAudience" ("id","eventId","audienceTypeId","createdAt") VALUES (?,?,?,?)',
                (f"ea-{ev_id}-{lvl}", ev_id, aud_map[lvl]["id"], now_iso),
            )

        sr_id = f"sr-{ev_id}"
        resolved_at = None if sp_status == "PENDING" else now_iso
        cur.execute(
            'INSERT INTO "SpaceRequest" ("id","eventId","spaceId","authorizerId","status","rejectionReason","revisionCount","requestedAt","resolvedAt","updatedAt") VALUES (?,?,?,?,?,?,1,?,?,?)',
            (sr_id, ev_id, sp["id"], sp["authorizerUserId"], sp_status, sp_rej_reason, now_iso, resolved_at, now_iso),
        )

        res_status = "APPROVED" if sp_status == "APPROVED" else ("PROVISIONAL" if sp_status == "PENDING" else "RELEASED")
        cur.execute(
            'INSERT INTO "Reservation" ("id","eventId","spaceId","scheduleChangeRequestId","reservationType","status","date","startTime","endTime","cleaningEndTime","startMinutes","endMinutes","cleaningEndMinutes","createdAt","updatedAt") VALUES (?,?,?,NULL,"ORIGINAL",?,?,?,?,?,?,?,?,?,?)',
            (f"res-{ev_id}", ev_id, sp["id"], res_status, ev_date, start_t, end_t, c_time, s_mins, e_mins, c_mins, now_iso, now_iso),
        )

        cur.execute(
            'INSERT INTO "AuditLog" ("id","userId","eventId","action","entityType","entityId","summary","reason","previousData","newData","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,NULL,NULL,?,1,?)',
            (
                f"aud-create-{ev_id}",
                creator["id"],
                ev_id,
                "EVENT_CREATED",
                "Event",
                ev_id,
                f'Evento "{name}" ({demo_code}) registrado para el espacio {space_name} el {ev_date} de {start_t} a {end_t} (limpieza hasta {c_time}).',
                json.dumps({"demoCode": demo_code, "space": space_name, "date": ev_date, "schedule": f"{start_t}-{end_t}"}),
                now_iso,
            ),
        )

        if sp_status == "PENDING":
            cur.execute(
                'INSERT INTO "Notification" ("id","userId","eventId","type","title","message","link","isRead","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,0,1,?)',
                (
                    f"notif-sp-{ev_id}",
                    sp["authorizerUserId"],
                    ev_id,
                    "SPACE_PENDING",
                    f"Solicitud de espacio pendiente ({demo_code})",
                    f'{creator["fullName"]} solicitó "{space_name}" para "{name}" ({ev_date}, {start_t}-{end_t}).',
                    "/autorizaciones",
                    now_iso,
                ),
            )
        elif sp_status == "APPROVED":
            cur.execute(
                'INSERT INTO "AuditLog" ("id","userId","eventId","action","entityType","entityId","summary","reason","previousData","newData","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,NULL,?,?,1,?)',
                (
                    f"aud-sp-app-{ev_id}",
                    sp["authorizerUserId"],
                    ev_id,
                    "SPACE_APPROVED",
                    "SpaceRequest",
                    sr_id,
                    f'Solicitud de espacio "{space_name}" APROBADA para el evento "{name}".',
                    json.dumps({"status": "PENDING"}),
                    json.dumps({"status": "APPROVED"}),
                    now_iso,
                ),
            )
            cur.execute(
                'INSERT INTO "Notification" ("id","userId","eventId","type","title","message","link","isRead","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,0,1,?)',
                (
                    f"notif-sp-app-{ev_id}",
                    creator["id"],
                    ev_id,
                    "SPACE_APPROVED",
                    f"Espacio aprobado: {name}",
                    f'Tu solicitud para "{space_name}" el {ev_date} ({start_t}-{end_t}) fue aprobada.',
                    f"/eventos/{ev_id}",
                    now_iso,
                ),
            )
        elif sp_status == "REJECTED":
            cur.execute(
                'INSERT INTO "AuditLog" ("id","userId","eventId","action","entityType","entityId","summary","reason","previousData","newData","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,?,?,?,1,?)',
                (
                    f"aud-sp-rej-{ev_id}",
                    sp["authorizerUserId"],
                    ev_id,
                    "SPACE_REJECTED",
                    "SpaceRequest",
                    sr_id,
                    f'Solicitud de espacio "{space_name}" RECHAZADA. Horario liberado.',
                    sp_rej_reason,
                    json.dumps({"status": "PENDING"}),
                    json.dumps({"status": "REJECTED", "rejectionReason": sp_rej_reason}),
                    now_iso,
                ),
            )
            cur.execute(
                'INSERT INTO "Notification" ("id","userId","eventId","type","title","message","link","isRead","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,0,1,?)',
                (
                    f"notif-sp-rej-{ev_id}",
                    creator["id"],
                    ev_id,
                    "SPACE_REJECTED",
                    f"Espacio rechazado: {name}",
                    f'Tu solicitud para "{space_name}" fue rechazada. Motivo: {sp_rej_reason}',
                    f"/eventos/{ev_id}",
                    now_iso,
                ),
            )

        if eq_codes and eq_desc and eq_status:
            eq_id = f"eqr-{ev_id}"
            eq_resolved = None if eq_status == "PENDING" else now_iso
            cur.execute(
                'INSERT INTO "EquipmentRequest" ("id","eventId","status","description","rejectionReason","authorizerId","revisionCount","requestedAt","resolvedAt","updatedAt") VALUES (?,?,?,?,?,?,1,?,?,?)',
                (eq_id, ev_id, eq_status, eq_desc, eq_rej_reason, extuni["id"], now_iso, eq_resolved, now_iso),
            )
            for c in eq_codes:
                cur.execute(
                    'INSERT INTO "EquipmentRequestType" ("id","equipmentRequestId","equipmentTypeId") VALUES (?,?,?)',
                    (f"eqrt-{ev_id}-{c}", eq_id, eq_map[c]["id"]),
                )

            if eq_status == "PENDING":
                cur.execute(
                    'INSERT INTO "Notification" ("id","userId","eventId","type","title","message","link","isRead","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,0,1,?)',
                    (
                        f"notif-eq-{ev_id}",
                        extuni["id"],
                        ev_id,
                        "EQUIPMENT_PENDING",
                        f"Solicitud de equipo pendiente ({demo_code})",
                        f'Se requiere autorización de equipo para "{name}".',
                        "/autorizaciones",
                        now_iso,
                    ),
                )
            elif eq_status == "APPROVED":
                cur.execute(
                    'INSERT INTO "AuditLog" ("id","userId","eventId","action","entityType","entityId","summary","reason","previousData","newData","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,NULL,?,?,1,?)',
                    (
                        f"aud-eq-app-{ev_id}",
                        extuni["id"],
                        ev_id,
                        "EQUIPMENT_APPROVED",
                        "EquipmentRequest",
                        eq_id,
                        "Solicitud de equipo APROBADA por Extensión Universitaria.",
                        json.dumps({"status": "PENDING"}),
                        json.dumps({"status": "APPROVED"}),
                        now_iso,
                    ),
                )
            elif eq_status == "REJECTED":
                cur.execute(
                    'INSERT INTO "AuditLog" ("id","userId","eventId","action","entityType","entityId","summary","reason","previousData","newData","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,?,?,?,1,?)',
                    (
                        f"aud-eq-rej-{ev_id}",
                        extuni["id"],
                        ev_id,
                        "EQUIPMENT_REJECTED",
                        "EquipmentRequest",
                        eq_id,
                        "Solicitud de equipo RECHAZADA por Extensión Universitaria. La reservación del espacio continúa vigente.",
                        eq_rej_reason,
                        json.dumps({"status": "PENDING"}),
                        json.dumps({"status": "REJECTED", "rejectionReason": eq_rej_reason}),
                        now_iso,
                    ),
                )
                cur.execute(
                    'INSERT INTO "Notification" ("id","userId","eventId","type","title","message","link","isRead","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,0,1,?)',
                    (
                        f"notif-eq-rej-{ev_id}",
                        creator["id"],
                        ev_id,
                        "EQUIPMENT_REJECTED",
                        f"Equipo rechazado: {name}",
                        f"El equipo solicitado fue rechazado (el espacio continúa aprobado). Motivo: {eq_rej_reason}",
                        f"/eventos/{ev_id}",
                        now_iso,
                    ),
                )

        if sched_change:
            prop_s, prop_e, sc_reason = sched_change
            ps_mins = time_to_minutes(prop_s)
            pe_mins = time_to_minutes(prop_e)
            pc_mins = pe_mins + 60
            pc_time = minutes_to_time(pc_mins)
            sc_id = f"scr-{ev_id}"

            cur.execute(
                'INSERT INTO "ScheduleChangeRequest" ("id","eventId","spaceId","requestedById","authorizerId","originalDate","originalStartTime","originalEndTime","originalCleaningEndTime","proposedDate","proposedStartTime","proposedEndTime","proposedCleaningEndTime","proposedStartMinutes","proposedEndMinutes","proposedCleaningEndMinutes","reason","status","requestedAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,"PENDING",?,?)',
                (
                    sc_id,
                    ev_id,
                    sp["id"],
                    creator["id"],
                    sp["authorizerUserId"],
                    ev_date,
                    start_t,
                    end_t,
                    c_time,
                    ev_date,
                    prop_s,
                    prop_e,
                    pc_time,
                    ps_mins,
                    pe_mins,
                    pc_mins,
                    sc_reason,
                    now_iso,
                    now_iso,
                ),
            )
            cur.execute(
                'INSERT INTO "Reservation" ("id","eventId","spaceId","scheduleChangeRequestId","reservationType","status","date","startTime","endTime","cleaningEndTime","startMinutes","endMinutes","cleaningEndMinutes","createdAt","updatedAt") VALUES (?,?,?,?,"SCHEDULE_CHANGE","PROVISIONAL",?,?,?,?,?,?,?,?,?)',
                (f"res-sc-{ev_id}", ev_id, sp["id"], sc_id, ev_date, prop_s, prop_e, pc_time, ps_mins, pe_mins, pc_mins, now_iso, now_iso),
            )
            cur.execute(
                'INSERT INTO "AuditLog" ("id","userId","eventId","action","entityType","entityId","summary","reason","previousData","newData","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,?,?,?,1,?)',
                (
                    f"aud-sc-{ev_id}",
                    creator["id"],
                    ev_id,
                    "SCHEDULE_CHANGE_REQUESTED",
                    "ScheduleChangeRequest",
                    sc_id,
                    f"Solicitud de cambio de horario pendiente: mantener vigente {start_t}-{end_t} y bloquear provisionalmente {prop_s}-{prop_e}.",
                    sc_reason,
                    json.dumps({"startTime": start_t, "endTime": end_t}),
                    json.dumps({"proposedStartTime": prop_s, "proposedEndTime": prop_e}),
                    now_iso,
                ),
            )
            cur.execute(
                'INSERT INTO "Notification" ("id","userId","eventId","type","title","message","link","isRead","isDemo","createdAt") VALUES (?,?,?,?,?,?,?,0,1,?)',
                (
                    f"notif-sc-{ev_id}",
                    sp["authorizerUserId"],
                    ev_id,
                    "SCHEDULE_CHANGE_PENDING",
                    f"Modificación de horario pendiente ({demo_code})",
                    f'Se solicitó cambiar el horario de "{name}" en {space_name} de {start_t}-{end_t} a {prop_s}-{prop_e}.',
                    "/autorizaciones",
                    now_iso,
                ),
            )

        if demo_code in written_pdfs:
            pdf_meta = written_pdfs[demo_code]
            evdoc_id = f"evdoc-{ev_id}"
            cur.execute(
                'INSERT INTO "EventEvidence" ("id","eventId","fileName","storedName","filePath","fileSize","mimeType","uploadedById","isDemo","uploadedAt") VALUES (?,?,?,?,?,?,"application/pdf",?,1,?)',
                (
                    evdoc_id,
                    ev_id,
                    pdf_meta["fileName"],
                    pdf_meta["storedName"],
                    pdf_meta["storedName"],
                    pdf_meta["fileSize"],
                    creator["id"],
                    now_iso,
                ),
            )

    conn.commit()
    conn.close()
    print("SQLite database prisma/dev.db and Demo PDFs created successfully.")


if __name__ == "__main__":
    main()

