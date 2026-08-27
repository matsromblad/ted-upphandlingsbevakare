import { hitsDao, profileDao, watchlistDao } from '../db.js';

const MAILTRAP_API_URL = process.env.MAILTRAP_API_URL || 'https://send.api.mailtrap.io/api/send';
const MAILTRAP_API_TOKEN = process.env.MAILTRAP_API_TOKEN || '';
const MAILTRAP_FROM_EMAIL = process.env.MAILTRAP_FROM_EMAIL || '';
const MAILTRAP_FROM_NAME = process.env.MAILTRAP_FROM_NAME || 'TED Upphandlingsbevakare';
const MAILTRAP_CATEGORY = process.env.MAILTRAP_CATEGORY || 'Watchlist Digest';

const digestCadenceMs = {
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000
};

export const WATCHLIST_EMAIL_FREQUENCY_LABELS = {
  daily: 'Dagligen',
  weekly: 'Veckovis'
};

function getAppBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/+$/, '');
}

function getApiBaseUrl() {
  return (process.env.API_BASE_URL || process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 3001}`).replace(/\/+$/, '');
}

function emailDeliveryIsConfigured() {
  return Boolean(MAILTRAP_API_URL && MAILTRAP_API_TOKEN && MAILTRAP_FROM_EMAIL);
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDateTime(value) {
  if (!value) {
    return 'Okant datum';
  }

  return new Date(value).toLocaleString('sv-SE');
}

function formatNoticeLocation(notice) {
  return [notice.city, notice.country].filter(Boolean).join(', ') || 'Ej angivet';
}

function getNoticeUrl(notice) {
  return notice.links?.tedHtml || notice.links?.tedPdf || getAppBaseUrl();
}

function parseNotice(hit) {
  if (!hit.notice_data_json) {
    return {};
  }

  return typeof hit.notice_data_json === 'string'
    ? JSON.parse(hit.notice_data_json)
    : hit.notice_data_json;
}

function isDigestDue(watchlist) {
  const frequency = watchlist.email_frequency === 'weekly' ? 'weekly' : 'daily';
  const reference = watchlist.last_email_sent_at || watchlist.created_at || watchlist.last_run_at;

  if (!reference) {
    return true;
  }

  return Date.now() - new Date(reference).getTime() >= digestCadenceMs[frequency];
}

export function buildWatchlistManageUrl(watchlist) {
  const url = new URL(getAppBaseUrl());
  url.searchParams.set('view', 'watchlists');
  url.searchParams.set('tab', 'feed');
  url.searchParams.set('watchlist', watchlist.id);
  return url.toString();
}

export function buildWatchlistUnsubscribeUrl(watchlist) {
  return `${getApiBaseUrl()}/api/watchlists/unsubscribe/${encodeURIComponent(watchlist.unsubscribe_token)}`;
}

function buildDigestSubject(watchlist, hitCount) {
  const suffix = hitCount === 1 ? 'ny upphandling' : `${hitCount} nya upphandlingar`;
  return `TED-bevakning: ${suffix} for ${watchlist.name}`;
}

async function sendViaMailtrap({ to, subject, text, html }) {
  const response = await fetch(MAILTRAP_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${MAILTRAP_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: {
        email: MAILTRAP_FROM_EMAIL,
        name: MAILTRAP_FROM_NAME
      },
      to: [{ email: to }],
      subject,
      text,
      html,
      category: MAILTRAP_CATEGORY
    })
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Mailtrap API error (${response.status})`);
  }

  return payload;
}

function buildDigestText(recipientName, watchlist, notices) {
  const manageUrl = buildWatchlistManageUrl(watchlist);
  const unsubscribeUrl = buildWatchlistUnsubscribeUrl(watchlist);

  return [
    `Hej ${recipientName || 'dar'},`,
    '',
    `Din bevakning "${watchlist.name}" har ${notices.length} nya relevanta upphandlingar.`,
    '',
    ...notices.flatMap((notice, index) => [
      `${index + 1}. ${notice.title || 'Upphandling'}`,
      `   Upphandlare: ${notice.buyer || 'Ej angivet'}`,
      `   Plats: ${formatNoticeLocation(notice)}`,
      `   Deadline: ${notice.deadline || 'Ej angiven'}`,
      `   Lank: ${getNoticeUrl(notice)}`,
      ''
    ]),
    `Oppna bevakning: ${manageUrl}`,
    `Avregistrera bevakning: ${unsubscribeUrl}`
  ].join('\n');
}

function buildDigestHtml(recipientName, watchlist, notices) {
  const manageUrl = buildWatchlistManageUrl(watchlist);
  const unsubscribeUrl = buildWatchlistUnsubscribeUrl(watchlist);
  const cadenceLabel = WATCHLIST_EMAIL_FREQUENCY_LABELS[watchlist.email_frequency] || WATCHLIST_EMAIL_FREQUENCY_LABELS.daily;

  const rows = notices.map((notice) => `
    <tr>
      <td style="padding: 18px 0; border-bottom: 1px solid #e2e8f0;">
        <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">
          <a href="${escapeHtml(getNoticeUrl(notice))}" style="color: #0f172a; text-decoration: none;">${escapeHtml(notice.title || 'Upphandling')}</a>
        </div>
        <div style="font-size: 14px; color: #475569; line-height: 1.6;">
          <div><strong>Upphandlare:</strong> ${escapeHtml(notice.buyer || 'Ej angivet')}</div>
          <div><strong>Plats:</strong> ${escapeHtml(formatNoticeLocation(notice))}</div>
          <div><strong>Deadline:</strong> ${escapeHtml(notice.deadline || 'Ej angiven')}</div>
          <div><strong>Publicerad:</strong> ${escapeHtml(formatDateTime(notice.publicationDate))}</div>
        </div>
      </td>
    </tr>
  `).join('');

  return `
    <div style="margin: 0; padding: 32px 16px; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0;">
        <tr>
          <td style="padding: 32px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #ffffff;">
            <div style="font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.9;">TED Upphandlingsbevakare</div>
            <h1 style="margin: 12px 0 8px; font-size: 28px; line-height: 1.2;">${escapeHtml(watchlist.name)}</h1>
            <p style="margin: 0; font-size: 16px; line-height: 1.6;">
              Hej ${escapeHtml(recipientName || 'dar')}! Din ${escapeHtml(cadenceLabel.toLowerCase())} sammanfattning innehaller ${notices.length} relevanta upphandlingar.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px 32px 8px;">
            <div style="margin-bottom: 20px;">
              <a href="${escapeHtml(manageUrl)}" style="display: inline-block; margin-right: 12px; margin-bottom: 12px; padding: 12px 18px; border-radius: 999px; background: #0f172a; color: #ffffff; text-decoration: none; font-weight: 700;">Oppna bevakning</a>
              <a href="${escapeHtml(unsubscribeUrl)}" style="display: inline-block; margin-bottom: 12px; padding: 12px 18px; border-radius: 999px; background: #fff7ed; color: #c2410c; text-decoration: none; font-weight: 700; border: 1px solid #fdba74;">Avregistrera</a>
            </div>
            <p style="margin: 0 0 12px; color: #475569; font-size: 14px; line-height: 1.6;">
              Alla upphandlingar nedan ar nya for denna bevakning sedan forra utskicket.
            </p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              ${rows}
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export async function maybeSendWatchlistDigestEmail(watchlist) {
  if (!watchlist?.active) {
    return { success: true, skipped: true, reason: 'inactive-watchlist' };
  }

  if (!watchlist.unsubscribe_token) {
    throw new Error(`Watchlist ${watchlist.id} saknar unsubscribe-token`);
  }

  const pendingHits = await hitsDao.getPendingEmailHits(watchlist.id, watchlist.user_id);
  if (!pendingHits.length) {
    return { success: true, skipped: true, reason: 'no-pending-hits' };
  }

  if (!isDigestDue(watchlist)) {
    return { success: true, skipped: true, reason: 'digest-not-due', pendingHits: pendingHits.length };
  }

  const recipient = await profileDao.getNotificationRecipient(watchlist.user_id);
  if (!recipient?.email) {
    console.warn(`[Watchlist Email] Skipping ${watchlist.id}: missing recipient email.`);
    return { success: false, skipped: true, reason: 'missing-recipient-email' };
  }

  if (!emailDeliveryIsConfigured()) {
    console.warn(`[Watchlist Email] Skipping ${watchlist.id}: Mailtrap API is not configured.`);
    return { success: false, skipped: true, reason: 'mailtrap-not-configured' };
  }

  const notices = pendingHits.map(parseNotice);
  const info = await sendViaMailtrap({
    to: recipient.email,
    subject: buildDigestSubject(watchlist, notices.length),
    text: buildDigestText(recipient.fullName || recipient.companyName, watchlist, notices),
    html: buildDigestHtml(recipient.fullName || recipient.companyName, watchlist, notices)
  });

  const sentAt = new Date().toISOString();
  await hitsDao.markAsEmailed(pendingHits.map(hit => hit.id), watchlist.user_id, sentAt);
  await watchlistDao.updateEmailSentAt(watchlist.id, watchlist.user_id, sentAt);

  console.log(`[Watchlist Email] Sent digest for watchlist "${watchlist.name}" to ${recipient.email} (${notices.length} notices).`);
  return {
    success: true,
    sent: true,
    messageId: info?.message_ids?.[0] || info?.message_id || null,
    hits: notices.length
  };
}
