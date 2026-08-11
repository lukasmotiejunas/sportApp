import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Lumo <noreply@lumosport.lt>';

function wrapper(body: string) {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px">
      ${body}
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">Lumo — sporto klubų valdymo platforma</p>
    </div>
  `;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Slaptažodžio atnaujinimas',
    html: wrapper(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#0b0e18">Slaptažodžio atnaujinimas</h2>
      <p style="margin:0 0 24px;color:#4b5563;font-size:14px">
        Gavome prašymą atnaujinti jūsų slaptažodį. Norėdami tęsti, spauskite žemiau esantį mygtuką.
        Nuoroda galioja <strong>1 valandą</strong>.
      </p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0b0e18;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
        Atnaujinti slaptažodį
      </a>
      <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">
        Jei šio prašymo nepateikėte – nieko nedarykite, slaptažodis nepasikeis.
      </p>
    `),
  });
}

export async function sendNewTrainingToMemberEmail(
  to: string,
  memberName: string,
  trainingTitle: string,
  trainingDate: string,
  trainingTime: string,
  trainingUrl: string,
  clubName: string,
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Nauja treniruotė — ${trainingTitle}`,
    html: wrapper(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#0b0e18">Nauja treniruotė!</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px">
        Sveiki, <strong>${memberName}</strong>! Klube <strong>${clubName}</strong> sukurta nauja treniruotė:
      </p>
      <div style="background:#fff;border-radius:8px;padding:16px;font-size:14px;color:#0b0e18;margin-bottom:24px">
        <div style="font-weight:700;font-size:16px">${trainingTitle}</div>
        <div style="color:#6b7280;margin-top:4px;font-size:13px">${trainingDate}, ${trainingTime}</div>
      </div>
      <a href="${trainingUrl}" style="display:inline-block;padding:12px 24px;background:#0b0e18;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
        Peržiūrėti ir registruotis
      </a>
    `),
  });
}

export async function sendNewMemberEmail(to: string, memberName: string, clubName: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Naujas narys — ${memberName}`,
    html: wrapper(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#0b0e18">Naujas narys užregistruotas</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px">
        Klubui <strong>${clubName}</strong> buvo pridėtas naujas narys:
      </p>
      <div style="background:#fff;border-radius:8px;padding:16px;font-size:14px;color:#0b0e18;font-weight:600">
        ${memberName}
      </div>
    `),
  });
}

export async function sendNewTrainingEmail(
  to: string,
  trainingTitle: string,
  trainingDate: string,
  clubName: string,
) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Nauja treniruotė — ${trainingTitle}`,
    html: wrapper(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#0b0e18">Nauja treniruotė sukurta</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px">
        Klube <strong>${clubName}</strong> buvo sukurta nauja treniruotė:
      </p>
      <div style="background:#fff;border-radius:8px;padding:16px;font-size:14px;color:#0b0e18">
        <div style="font-weight:600">${trainingTitle}</div>
        <div style="color:#6b7280;margin-top:4px;font-size:13px">${trainingDate}</div>
      </div>
    `),
  });
}

export async function sendPaymentEmail(
  to: string,
  memberName: string,
  amountCents: number,
  currency: string,
  clubName: string,
) {
  const amount = (amountCents / 100).toFixed(2);
  const curr = currency.toUpperCase();
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Mokėjimas gautas — ${memberName}`,
    html: wrapper(`
      <h2 style="margin:0 0 8px;font-size:20px;color:#0b0e18">Mokėjimas gautas</h2>
      <p style="margin:0 0 16px;color:#4b5563;font-size:14px">
        Klubas <strong>${clubName}</strong> gavo mokėjimą:
      </p>
      <div style="background:#fff;border-radius:8px;padding:16px;font-size:14px;color:#0b0e18">
        <div style="font-weight:600">${memberName}</div>
        <div style="color:#16a34a;margin-top:4px;font-size:18px;font-weight:700">${amount} ${curr}</div>
      </div>
    `),
  });
}
