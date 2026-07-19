// Общий модуль транзакционных email для BridoConnect.
// Здесь живут шаблоны (SUBJECTS/TEMPLATE_BODIES), рендер и единый отправитель
// поверх Resend. Все edge-функции шлют письма через sendTransactionalEmail —
// одна точка рендера и логирования (таблица email_log).
//
// Отправитель никогда не бросает наружу и делает no-op, если RESEND_API_KEY
// не задан (skipped:true) — вызывающие функции (webhook/release) не должны
// падать из-за писем.

export type Template =
  | "welcome"
  | "deal_created"
  | "payment_received"
  | "escrow_released"
  | "dispute_opened"
  | "kyc_approved"
  | "password_reset";

const FROM = Deno.env.get("EMAIL_FROM") || "BridoConnect <no-reply@bridoconnect.com>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") || "support@bridoconnect.com";
const APP_URL = Deno.env.get("APP_URL") || "https://bridoconnect.com";

export const SUBJECTS: Record<Template, Record<string, string>> = {
  welcome: {
    uk: "Ласкаво просимо до BridoConnect",
    en: "Welcome to BridoConnect",
    de: "Willkommen bei BridoConnect",
    ru: "Добро пожаловать в BridoConnect",
    pl: "Witamy w BridoConnect",
  },
  deal_created: {
    uk: "Ваша угода створена",
    en: "Your deal is live",
    de: "Deine Aktion ist online",
    ru: "Ваша сделка создана",
    pl: "Twoja transakcja jest aktywna",
  },
  payment_received: {
    uk: "Ви отримали підтримку 🎉",
    en: "You just got support 🎉",
    de: "Du hast Unterstützung erhalten 🎉",
    ru: "Вам поступила поддержка 🎉",
    pl: "Otrzymałeś wsparcie 🎉",
  },
  escrow_released: {
    uk: "Кошти розблоковані",
    en: "Funds released",
    de: "Guthaben freigegeben",
    ru: "Средства разблокированы",
    pl: "Środki uwolnione",
  },
  dispute_opened: {
    uk: "Відкрито спір по вашій угоді",
    en: "Dispute opened on your deal",
    de: "Streitfall zu deiner Aktion",
    ru: "Открыт спор по вашей сделке",
    pl: "Otwarto spór w twojej transakcji",
  },
  kyc_approved: {
    uk: "Верифікація пройдена ✅",
    en: "KYC approved ✅",
    de: "Verifizierung erfolgreich ✅",
    ru: "Верификация пройдена ✅",
    pl: "Weryfikacja zakończona ✅",
  },
  password_reset: {
    uk: "Відновлення паролю",
    en: "Reset your password",
    de: "Passwort zurücksetzen",
    ru: "Сброс пароля",
    pl: "Reset hasła",
  },
};

export const TEMPLATE_BODIES: Record<Template, Record<string, string>> = {
  welcome: {
    uk: `<h1>Ласкаво просимо, {{name}}!</h1><p>Ти приєднався до P2P-платформи, де допомога йде напряму — від людини до людини.</p><p><a href="{{appUrl}}/app">Відкрити стрічку</a></p>`,
    en: `<h1>Welcome, {{name}}!</h1><p>You've joined a P2P platform where help goes person-to-person.</p><p><a href="{{appUrl}}/app">Open feed</a></p>`,
    de: `<h1>Willkommen, {{name}}!</h1><p>Du bist Teil einer P2P-Plattform.</p><p><a href="{{appUrl}}/app">Feed öffnen</a></p>`,
    ru: `<h1>Добро пожаловать, {{name}}!</h1><p>Вы присоединились к P2P-платформе прямой помощи.</p><p><a href="{{appUrl}}/app">Открыть ленту</a></p>`,
    pl: `<h1>Witaj, {{name}}!</h1><p>Dołączyłeś do platformy P2P.</p><p><a href="{{appUrl}}/app">Otwórz feed</a></p>`,
  },
  deal_created: {
    uk: `<p>Твоя угода «{{dealTitle}}» опублікована.</p><p><a href="{{appUrl}}/app/deal/{{dealId}}">Переглянути</a></p>`,
    en: `<p>Your deal "{{dealTitle}}" is now live.</p><p><a href="{{appUrl}}/app/deal/{{dealId}}">View</a></p>`,
    de: `<p>Deine Aktion "{{dealTitle}}" ist online.</p><p><a href="{{appUrl}}/app/deal/{{dealId}}">Ansehen</a></p>`,
    ru: `<p>Ваша сделка «{{dealTitle}}» опубликована.</p><p><a href="{{appUrl}}/app/deal/{{dealId}}">Открыть</a></p>`,
    pl: `<p>Twoja transakcja "{{dealTitle}}" jest aktywna.</p><p><a href="{{appUrl}}/app/deal/{{dealId}}">Zobacz</a></p>`,
  },
  payment_received: {
    uk: `<p>{{sponsorName}} підтримав вас на {{amount}} {{currency}}.</p><p><a href="{{appUrl}}/app/deal/{{dealId}}">Деталі</a></p>`,
    en: `<p>{{sponsorName}} supported you with {{amount}} {{currency}}.</p><p><a href="{{appUrl}}/app/deal/{{dealId}}">Details</a></p>`,
    de: `<p>{{sponsorName}} hat dich mit {{amount}} {{currency}} unterstützt.</p>`,
    ru: `<p>{{sponsorName}} поддержал вас на {{amount}} {{currency}}.</p>`,
    pl: `<p>{{sponsorName}} wsparł cię kwotą {{amount}} {{currency}}.</p>`,
  },
  escrow_released: {
    uk: `<p>Кошти в сумі {{amount}} {{currency}} по угоді {{dealId}} розблоковані.</p>`,
    en: `<p>Funds of {{amount}} {{currency}} for deal {{dealId}} are released.</p>`,
    de: `<p>Guthaben von {{amount}} {{currency}} wurde freigegeben.</p>`,
    ru: `<p>Средства {{amount}} {{currency}} по сделке разблокированы.</p>`,
    pl: `<p>Środki {{amount}} {{currency}} zostały uwolnione.</p>`,
  },
  dispute_opened: {
    uk: `<p>По угоді {{dealId}} відкрито спір. Причина: {{reason}}.</p><p><a href="{{appUrl}}/app/dispute/{{dealId}}">Відкрити</a></p>`,
    en: `<p>A dispute has been opened on deal {{dealId}}. Reason: {{reason}}.</p>`,
    de: `<p>Streitfall zur Aktion {{dealId}} eröffnet.</p>`,
    ru: `<p>По сделке {{dealId}} открыт спор. Причина: {{reason}}.</p>`,
    pl: `<p>Otwarto spór w transakcji {{dealId}}.</p>`,
  },
  kyc_approved: {
    uk: `<p>Ваша верифікація пройшла успішно. Trust Score +25.</p>`,
    en: `<p>Your KYC verification passed. Trust Score +25.</p>`,
    de: `<p>Deine Verifizierung war erfolgreich.</p>`,
    ru: `<p>Ваша верификация пройдена. Trust Score +25.</p>`,
    pl: `<p>Twoja weryfikacja jest zakończona.</p>`,
  },
  password_reset: {
    uk: `<p>Для скидання паролю перейдіть за посиланням: <a href="{{resetUrl}}">{{resetUrl}}</a></p><p>Посилання дійсне 30 хвилин.</p>`,
    en: `<p>Reset your password: <a href="{{resetUrl}}">{{resetUrl}}</a></p><p>Link valid 30 minutes.</p>`,
    de: `<p>Passwort zurücksetzen: <a href="{{resetUrl}}">{{resetUrl}}</a></p>`,
    ru: `<p>Сброс пароля: <a href="{{resetUrl}}">{{resetUrl}}</a></p>`,
    pl: `<p>Zresetuj hasło: <a href="{{resetUrl}}">{{resetUrl}}</a></p>`,
  },
};

export function wrapEmail(subject: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:-apple-system,Segoe UI,sans-serif;background:#f4f4f6;margin:0;padding:24px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.05)">
    <tr><td style="background:linear-gradient(135deg,#c0392b,#8e2b1d);padding:24px;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">BridoConnect</h1>
    </td></tr>
    <tr><td style="padding:32px 28px;color:#1a1a1a;font-size:15px;line-height:1.6">
      ${body}
    </td></tr>
    <tr><td style="padding:16px 28px;background:#fafafa;border-top:1px solid #eee;font-size:12px;color:#888;text-align:center">
      Luftarbeiter GmbH · Auerbach, DE · <a href="mailto:${REPLY_TO}" style="color:#888">${REPLY_TO}</a><br>
      Ви отримали цей лист, бо створили акаунт на BridoConnect.
    </td></tr>
  </table>
</body></html>`;
}

export function renderTemplate(t: Template, locale: string, vars: Record<string, string | number>) {
  const subject = SUBJECTS[t]?.[locale] ?? SUBJECTS[t]?.en ?? "BridoConnect";
  // Minimal HTML — деталь в variables. Верстка одинаковая, содержание меняется.
  const body = TEMPLATE_BODIES[t]?.[locale] ?? TEMPLATE_BODIES[t]?.en ?? "";
  const rendered = body.replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? ""));
  const html = wrapEmail(subject, rendered);
  return { subject, html };
}

export interface SendTransactionalEmailParams {
  to: string;
  template: Template;
  locale?: string;
  vars?: Record<string, string | number>;
  userId?: string | null;
  supabase: any;
}

export interface SendTransactionalEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

// Единый отправитель. Никогда не бросает; при отсутствии RESEND_API_KEY —
// тихий no-op (skipped:true).
export async function sendTransactionalEmail(
  params: SendTransactionalEmailParams
): Promise<SendTransactionalEmailResult> {
  try {
    const { to, template, supabase } = params;
    if (!to) return { ok: false, error: "no recipient" };

    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    if (!resendKey) return { ok: false, skipped: true };

    const locale = params.locale ?? "uk";
    const vars = { appUrl: APP_URL, ...(params.vars ?? {}) };
    const { subject, html } = renderTemplate(template, locale, vars);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [to],
        reply_to: REPLY_TO,
        subject,
        html,
        tags: [
          { name: "template", value: template },
          { name: "locale", value: locale },
        ],
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: `resend_failed: ${text.slice(0, 200)}` };
    }
    const result = await res.json();

    // Audit log — таблица email_log (в миграции 018)
    await supabase.from("email_log").insert({
      to,
      template,
      locale,
      provider_id: result.id,
      user_id: params.userId ?? null,
    });

    return { ok: true, id: result.id };
  } catch (err) {
    console.error("sendTransactionalEmail error", err);
    return { ok: false, error: String(err) };
  }
}
