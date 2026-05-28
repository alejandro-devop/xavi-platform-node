import { Resend } from 'resend';
import { logger } from '../shared/logger';

const resend = process.env.EMAIL_API_KEY ? new Resend(process.env.EMAIL_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'noreply@xavi.app';

async function send(to: string, subject: string, html: string): Promise<void> {
  if (!resend) {
    logger.warn({ to, subject }, '[sweeter-way] Email service not configured, skipping send');
    return;
  }
  try {
    const result = await resend.emails.send({ from: FROM, to, subject, html });
    if (result.error) {
      logger.error({ error: result.error, to, subject }, '[sweeter-way] Email send failed');
    } else {
      logger.info({ to, subject, messageId: result.data?.id }, '[sweeter-way] Email sent');
    }
  } catch (err) {
    logger.error({ err, to, subject }, '[sweeter-way] Unexpected error sending email');
  }
}

export const swEmailService = {
  async sendBondRequested(
    requesterName: string,
    addresseeEmail: string,
    addresseeName: string
  ): Promise<void> {
    const html = `<p>Hola ${addresseeName},</p>
<p><strong>${requesterName}</strong> te ha enviado una invitación para ser cinnamons en Xavi.</p>
<p>Abre la app para aceptar o rechazar la invitación.</p>`;
    await send(addresseeEmail, '💌 Tienes una invitación de cinnamon — Xavi', html);
  },

  async sendBondAccepted(
    addresseeName: string,
    requesterEmail: string,
    requesterName: string
  ): Promise<void> {
    const html = `<p>Hola ${requesterName},</p>
<p><strong>${addresseeName}</strong> aceptó tu invitación. ¡Ya son cinnamons! 🎉</p>
<p>Abre la app para empezar a crear listas juntos.</p>`;
    await send(requesterEmail, '🎉 ¡Tu invitación fue aceptada! — Xavi', html);
  },

  async sendBondRejected(
    addresseeName: string,
    requesterEmail: string,
    requesterName: string
  ): Promise<void> {
    const html = `<p>Hola ${requesterName},</p>
<p><strong>${addresseeName}</strong> rechazó tu invitación de cinnamon.</p>
<p>Puedes invitar a otra persona desde la app cuando quieras.</p>`;
    await send(requesterEmail, 'Invitación de cinnamon rechazada — Xavi', html);
  },

  async sendItemAdded(
    actorName: string,
    cinnamonEmail: string,
    cinnamonName: string,
    itemTitle: string,
    listTitle: string
  ): Promise<void> {
    const html = `<p>Hola ${cinnamonName},</p>
<p><strong>${actorName}</strong> agregó <strong>${itemTitle}</strong> a la lista <em>${listTitle}</em>.</p>`;
    await send(cinnamonEmail, `📍 Nuevo lugar en "${listTitle}" — Xavi`, html);
  },

  async sendItemCompleted(
    actorName: string,
    cinnamonEmail: string,
    cinnamonName: string,
    itemTitle: string,
    listTitle: string
  ): Promise<void> {
    const html = `<p>Hola ${cinnamonName},</p>
<p><strong>${actorName}</strong> marcó <strong>${itemTitle}</strong> como completado en <em>${listTitle}</em>. ✅</p>
<p>Abre la app para dejar tu log emocional.</p>`;
    await send(cinnamonEmail, `✅ "${itemTitle}" completado — Xavi`, html);
  },

  async sendLogAdded(
    actorName: string,
    cinnamonEmail: string,
    cinnamonName: string,
    itemTitle: string
  ): Promise<void> {
    const html = `<p>Hola ${cinnamonName},</p>
<p><strong>${actorName}</strong> dejó un log en <strong>${itemTitle}</strong>. 💬</p>
<p>Abre la app para ver lo que escribió.</p>`;
    await send(cinnamonEmail, `💬 Nuevo log en "${itemTitle}" — Xavi`, html);
  },
};
