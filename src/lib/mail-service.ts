import net from 'net';
import tls from 'tls';
import crypto from 'crypto';
import { prisma } from './prisma';
import { readStoredQrPngBuffer } from './qr-service';

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
  configured: boolean;
}

export function getSmtpConfig(): SmtpConfig {
  const host = (process.env.MAIL_HOST || '').trim();
  const port = parseInt(process.env.MAIL_PORT || '587', 10) || 587;
  const user = (process.env.MAIL_USER || '').trim();
  const password = process.env.MAIL_PASSWORD || '';
  const from = (process.env.MAIL_FROM || user || 'notificaciones.sreu@utc.edu.mx').trim();
  const secure =
    String(process.env.MAIL_SECURE || '').toLowerCase() === 'true' || port === 465;

  const configured = Boolean(host && port && from);
  return {
    host,
    port,
    user,
    password,
    from,
    secure,
    configured,
  };
}

/**
 * Sanitizes SMTP errors so credentials, tokens, or sensitive internal details are never stored.
 */
export function sanitizeMailError(rawError: unknown): string {
  const text = rawError instanceof Error ? rawError.message : String(rawError || 'Error SMTP');
  return text
    .replace(/password[=:\s]+[^\s]+/gi, 'password=[REDACTED]')
    .replace(/AUTH\s+(LOGIN|PLAIN)[^\r\n]*/gi, 'AUTH [REDACTED]')
    .replace(/sreu_qr_[0-9a-f]+/gi, '[QR_TOKEN_REDACTED]')
    .slice(0, 350);
}

/**
 * Sends a MIME email with the QR PNG attachment over SMTP / SMTPS / STARTTLS.
 */
async function sendRawSmtpMimeMessage(params: {
  config: SmtpConfig;
  toEmail: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  qrPngBuffer: Buffer;
}): Promise<{ providerMessageId: string }> {
  const { config, toEmail, subject, htmlBody, textBody, qrPngBuffer } = params;
  const boundary = `----=_SREU_Boundary_${crypto.randomBytes(8).toString('hex')}`;
  const altBoundary = `----=_SREU_Alt_${crypto.randomBytes(8).toString('hex')}`;
  const domainPart = config.from.includes('@') ? config.from.split('@')[1].replace(/[>]/g, '') : 'utc.edu.mx';
  const generatedMessageId = `<${Date.now()}.${crypto.randomBytes(6).toString('hex')}@${domainPart}>`;

  const extractAddress = (addr: string) => {
    const m = /<([^>]+)>/.exec(addr);
    return m ? m[1].trim() : addr.trim();
  };

  const fromAddress = extractAddress(config.from);
  const rcptAddress = extractAddress(toEmail);

  const mimeLines: string[] = [
    `From: ${config.from}`,
    `To: ${rcptAddress}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`,
    `Message-ID: ${generatedMessageId}`,
    `Date: ${new Date().toUTCString()}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    '',
    `--${altBoundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(textBody, 'utf8').toString('base64'),
    '',
    `--${altBoundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody, 'utf8').toString('base64'),
    '',
    `--${altBoundary}--`,
    '',
    `--${boundary}`,
    'Content-Type: image/png; name="pase-qr-acceso.png"',
    'Content-Transfer-Encoding: base64',
    'Content-Disposition: attachment; filename="pase-qr-acceso.png"',
    'Content-ID: <qr_acceso_sreu>',
    '',
    qrPngBuffer.toString('base64').replace(/(.{76})/g, '$1\r\n'),
    '',
    `--${boundary}--`,
    '',
  ];

  const dotStuffedPayload = mimeLines
    .join('\r\n')
    .replace(/\r\n\./g, '\r\n..');

  return new Promise((resolve, reject) => {
    let socket: net.Socket | tls.TLSSocket = config.secure
      ? tls.connect({
          host: config.host,
          port: config.port,
          servername: config.host,
        })
      : net.connect({
          host: config.host,
          port: config.port,
        });
    let settled = false;

    const finishError = (err: Error) => {
      if (settled) return;
      settled = true;
      try {
        socket?.destroy();
      } catch {
        // ignore
      }
      reject(err);
    };

    const timeoutMs = 12000;
    socket.setTimeout(timeoutMs, () =>
      finishError(new Error('Tiempo de espera agotado al conectar con el servidor SMTP.'))
    );
    socket.on('error', (err) => finishError(err));

    let buffer = '';
    let currentWaiter: ((code: number, fullText: string) => void) | null = null;

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\r\n');
      buffer = lines.pop() || '';

      let accumulated = '';
      for (const line of lines) {
        accumulated += line + '\n';
        if (/^\d{3}\s/.test(line)) {
          const code = parseInt(line.slice(0, 3), 10);
          const cb = currentWaiter;
          currentWaiter = null;
          if (cb) cb(code, accumulated.trim());
          accumulated = '';
        }
      }
    };

    socket!.on('data', onData);

    const sendCommand = (cmd: string | null, expectedCodes: number[]): Promise<string> =>
      new Promise((resCmd, rejCmd) => {
        currentWaiter = (code, text) => {
          if (expectedCodes.includes(code)) {
            resCmd(text);
          } else {
            rejCmd(new Error(`Respuesta SMTP inesperada (${code}): ${text}`));
          }
        };
        if (cmd !== null) {
          socket.write(cmd + '\r\n');
        }
      });

    (async () => {
      try {
        await sendCommand(null, [220]);
        const ehloResp = await sendCommand(`EHLO sreu.utc.local`, [250]);

        if (!config.secure && /STARTTLS/i.test(ehloResp)) {
          await sendCommand('STARTTLS', [220]);
          socket.removeListener('data', onData);
          const tlsSocket = tls.connect({
            socket,
            servername: config.host,
          });
          socket = tlsSocket;
          socket.setTimeout(timeoutMs, () => finishError(new Error('Timeout en negociación STARTTLS.')));
          socket.on('error', (err) => finishError(err));
          socket.on('data', onData);
          await sendCommand(`EHLO sreu.utc.local`, [250]);
        }

        if (config.user && config.password) {
          await sendCommand('AUTH LOGIN', [334]);
          await sendCommand(Buffer.from(config.user, 'utf8').toString('base64'), [334]);
          await sendCommand(Buffer.from(config.password, 'utf8').toString('base64'), [235]);
        }

        await sendCommand(`MAIL FROM:<${fromAddress}>`, [250]);
        await sendCommand(`RCPT TO:<${rcptAddress}>`, [250, 251]);
        await sendCommand('DATA', [354]);
        const dataAcceptResp = await sendCommand(`${dotStuffedPayload}\r\n.`, [250]);
        try {
          await sendCommand('QUIT', [221, 250]);
        } catch {
          // ignore QUIT warning
        }

        if (!settled) {
          settled = true;
          socket.end();
          resolve({
            providerMessageId: dataAcceptResp.slice(0, 120) || generatedMessageId,
          });
        }
      } catch (err) {
        finishError(err instanceof Error ? err : new Error(String(err)));
      }
    })();
  });
}

/**
 * Sends or resends an event invitation with the active individual QR attachment
 * and records the result in InvitationDelivery (Section 14).
 * Never duplicates attendee or QR credentials on resend.
 */
export async function sendOrResendAttendeeInvitation(params: {
  attendeeId: string;
}): Promise<{
  sent: boolean;
  status: 'PENDING' | 'SENT' | 'FAILED';
  deliveryId: string;
  message: string;
  errorMessage?: string | null;
}> {
  const attendee = await prisma.eventAttendee.findUnique({
    where: { id: params.attendeeId },
    include: {
      event: {
        include: { space: true },
      },
      qrCredentials: {
        where: { isActive: true, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
      invitationDeliveries: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!attendee) {
    throw new Error('Asistente no encontrado.');
  }

  if (attendee.registrationStatus === 'REVOKED') {
    throw new Error('No se puede enviar invitación a un registro revocado.');
  }

  const activeQr = attendee.qrCredentials[0];
  if (!activeQr) {
    throw new Error('El asistente no cuenta con una credencial QR activa.');
  }

  const smtpConfig = getSmtpConfig();
  const existingDelivery = attendee.invitationDeliveries[0];
  const prevAttempts = existingDelivery ? existingDelivery.attempts : 0;

  // If SMTP is not configured in .env, do NOT lose the attendee record; record clear status and allow QR download (Section 11 & 14)
  if (!smtpConfig.configured) {
    const infoMsg =
      'Proveedor SMTP no configurado (MAIL_HOST / MAIL_PORT / MAIL_FROM). El registro y el código QR están listos para consulta y descarga directa.';

    const delivery = existingDelivery
      ? await prisma.invitationDelivery.update({
          where: { id: existingDelivery.id },
          data: {
            recipientEmail: attendee.email,
            status: 'PENDING',
            attempts: prevAttempts + 1,
            lastAttemptAt: new Date(),
            errorMessage: infoMsg,
          },
        })
      : await prisma.invitationDelivery.create({
          data: {
            eventAttendeeId: attendee.id,
            recipientEmail: attendee.email,
            status: 'PENDING',
            attempts: 1,
            lastAttemptAt: new Date(),
            errorMessage: infoMsg,
          },
        });

    return {
      sent: false,
      status: 'PENDING',
      deliveryId: delivery.id,
      message: infoMsg,
      errorMessage: infoMsg,
    };
  }

  const qrPngBuffer = readStoredQrPngBuffer(activeQr.qrImagePath);
  if (!qrPngBuffer) {
    const errText = 'No se encontró la imagen QR en el almacenamiento privado.';
    const delivery = existingDelivery
      ? await prisma.invitationDelivery.update({
          where: { id: existingDelivery.id },
          data: {
            recipientEmail: attendee.email,
            status: 'FAILED',
            attempts: prevAttempts + 1,
            lastAttemptAt: new Date(),
            errorMessage: errText,
          },
        })
      : await prisma.invitationDelivery.create({
          data: {
            eventAttendeeId: attendee.id,
            recipientEmail: attendee.email,
            status: 'FAILED',
            attempts: 1,
            lastAttemptAt: new Date(),
            errorMessage: errText,
          },
        });

    return {
      sent: false,
      status: 'FAILED',
      deliveryId: delivery.id,
      message: errText,
      errorMessage: errText,
    };
  }

  const subject = `Invitación y Pase QR de Acceso: ${attendee.event.name}`;
  const textBody = [
    `UNIVERSIDAD TECNOLÓGICA — SISTEMA DE RESERVACIÓN DE ESPACIOS (SREU)`,
    `===================================================================`,
    `Estimado(a) ${attendee.fullName}:`,
    ``,
    `Se ha confirmado tu registro/invitación al siguiente evento universitario:`,
    `- Evento: ${attendee.event.name}`,
    `- Fecha: ${attendee.event.date}`,
    `- Horario: ${attendee.event.startTime} a ${attendee.event.endTime} hrs`,
    `- Espacio / Ubicación: ${attendee.event.space.name}`,
    ``,
    `INSTRUCCIONES DE ACCESO:`,
    `1. En este correo encontrarás adjunto tu código QR individual ("pase-qr-acceso.png").`,
    `2. Presenta el código QR desde tu celular o impreso al operador de acceso en la entrada del recinto.`,
    `3. El código QR es único, personal y válido para una sola entrada.`,
    `4. El operador podrá solicitar una identificación para cotejar tu identidad cuando sea necesario.`,
  ].join('\r\n');

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
      <div style="background: #064e3b; color: #ffffff; padding: 20px;">
        <h2 style="margin: 0; font-size: 18px;">SREU · Pase Individual de Acceso con Código QR</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #a7f3d0;">Universidad Tecnológica</p>
      </div>
      <div style="padding: 20px; color: #1e293b; font-size: 14px; line-height: 1.5;">
        <p>Estimado(a) <strong>${attendee.fullName}</strong>,</p>
        <p>Adjunto a este mensaje encontrarás tu <strong>código QR individual de acceso</strong> para el siguiente evento:</p>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 14px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Evento:</strong> ${attendee.event.name}</p>
          <p style="margin: 4px 0;"><strong>Fecha:</strong> ${attendee.event.date}</p>
          <p style="margin: 4px 0;"><strong>Horario:</strong> ${attendee.event.startTime} a ${attendee.event.endTime} hrs</p>
          <p style="margin: 4px 0;"><strong>Espacio:</strong> ${attendee.event.space.name}</p>
        </div>
        <h4 style="margin-bottom: 6px; color: #065f46;">Instrucciones para presentar el código en la entrada:</h4>
        <ul style="font-size: 13px; color: #334155; padding-left: 18px;">
          <li>Presenta la imagen adjunta (<code>pase-qr-acceso.png</code>) al operador de acceso al llegar al recinto.</li>
          <li>Tu código QR es individual y válido para registrar una única entrada.</li>
          <li>Recuerda llevar tu credencial institucional o identificación oficial en caso de que el operador requiera cotejarla.</li>
        </ul>
      </div>
    </div>
  `;

  try {
    const result = await sendRawSmtpMimeMessage({
      config: smtpConfig,
      toEmail: attendee.email,
      subject,
      htmlBody,
      textBody,
      qrPngBuffer,
    });

    const now = new Date();
    const delivery = existingDelivery
      ? await prisma.invitationDelivery.update({
          where: { id: existingDelivery.id },
          data: {
            recipientEmail: attendee.email,
            status: 'SENT',
            attempts: prevAttempts + 1,
            sentAt: now,
            lastAttemptAt: now,
            errorMessage: null,
            providerMessageId: result.providerMessageId,
          },
        })
      : await prisma.invitationDelivery.create({
          data: {
            eventAttendeeId: attendee.id,
            recipientEmail: attendee.email,
            status: 'SENT',
            attempts: 1,
            sentAt: now,
            lastAttemptAt: now,
            errorMessage: null,
            providerMessageId: result.providerMessageId,
          },
        });

    return {
      sent: true,
      status: 'SENT',
      deliveryId: delivery.id,
      message: `El servidor SMTP aceptó el envío para ${attendee.email} (Estado: SENT).`,
    };
  } catch (err) {
    const sanitizedError = sanitizeMailError(err);
    const now = new Date();

    const delivery = existingDelivery
      ? await prisma.invitationDelivery.update({
          where: { id: existingDelivery.id },
          data: {
            recipientEmail: attendee.email,
            status: 'FAILED',
            attempts: prevAttempts + 1,
            lastAttemptAt: now,
            errorMessage: sanitizedError,
          },
        })
      : await prisma.invitationDelivery.create({
          data: {
            eventAttendeeId: attendee.id,
            recipientEmail: attendee.email,
            status: 'FAILED',
            attempts: 1,
            lastAttemptAt: now,
            errorMessage: sanitizedError,
          },
        });

    return {
      sent: false,
      status: 'FAILED',
      deliveryId: delivery.id,
      message: `No se pudo enviar el correo por SMTP (${sanitizedError}). El registro y su código QR permanecen guardados para descarga directa.`,
      errorMessage: sanitizedError,
    };
  }
}
