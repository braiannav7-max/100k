// MercadoPago webhook → verifica el pago y envía el acceso por email (Resend).
// Configurar en Vercel (Project Settings → Environment Variables):
//   MP_ACCESS_TOKEN   → Access Token de producción de MercadoPago
//   RESEND_API_KEY    → API Key de Resend
// Configurar en MercadoPago (Tu aplicación → Webhooks): URL de notificación
//   https://prime90.shop/api/mp-webhook  (evento: pagos / payment)

const DRIVE_LINK = 'https://drive.google.com/drive/folders/1JDnjCZmWnJwh93JY6IObAUXWvdlk5Dps';
const FROM_EMAIL = 'Prime90 <acceso@prime90.shop>';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const topic = req.query.topic || req.query.type || req.body?.type;
  const paymentId = req.query['data.id'] || req.body?.data?.id;

  if (topic !== 'payment' || !paymentId) {
    res.status(200).send('ignored');
    return;
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    if (!mpRes.ok) {
      res.status(200).send('payment lookup failed');
      return;
    }
    const payment = await mpRes.json();

    if (payment.status !== 'approved') {
      res.status(200).send('not approved');
      return;
    }

    const buyerEmail = payment.payer?.email;
    if (!buyerEmail) {
      res.status(200).send('no payer email');
      return;
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: buyerEmail,
        subject: '✅ Tu acceso a Prime90 está listo',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;color:#111;">
            <h2>¡Compra confirmada!</h2>
            <p>Gracias por confiar en Prime90. Acá tenés tu acceso al ebook completo y todos los bonos:</p>
            <p style="margin:28px 0;">
              <a href="${DRIVE_LINK}" style="background:#7c3aed;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">📂 Acceder a mi material</a>
            </p>
            <p>Si el botón no funciona, copiá este link: <br>${DRIVE_LINK}</p>
            <p>Cualquier duda, respondé este email.</p>
          </div>
        `,
      }),
    });

    res.status(200).send('ok');
  } catch (err) {
    console.error('mp-webhook error', err);
    res.status(200).send('error handled');
  }
}
