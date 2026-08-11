import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = 'Lumo <noreply@lumosport.lt>';

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Slaptažodžio atnaujinimas',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px">
        <h2 style="margin:0 0 8px;font-size:20px;color:#0b0e18">Slaptažodžio atnaujinimas</h2>
        <p style="margin:0 0 24px;color:#4b5563;font-size:14px">
          Gavome prašymą atnaujinti jūsų slaptažodį. Norėdami tęsti, spauskite žemiau esantį mygtuką.
          Nuoroda galioja <strong>1 valandą</strong>.
        </p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0b0e18;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600">
          Atnaujinti slaptažodį
        </a>
        <p style="margin:24px 0 0;color:#9ca3af;font-size:12px">
          Jei šio prašymo nepateikėte – nieko nedarykite, slaptažodis nepasikeis.
        </p>
      </div>
    `,
  });
}
