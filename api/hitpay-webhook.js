const { HITPAY, HEADERS, discord, mail } = require('./_shared');

// HitPay calls this when a payment completes. We never trust the payload itself:
// we re-fetch the payment request from HitPay with our API key and check its status.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  const b = req.body || {};
  const id = String(b.payment_request_id || b.id || '');
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).end();

  let pr;
  try {
    const r = await fetch(`${HITPAY()}/v1/payment-requests/${id}`, { headers: HEADERS() });
    if (!r.ok) throw new Error('lookup failed');
    pr = await r.json();
  } catch (e) { return res.status(502).end(); } // 5xx so HitPay retries

  const refNo = String(pr.reference_number || '');
  if (pr.status !== 'completed' || !refNo.startsWith('AEG-')) return res.status(200).json({ ignored: true });
  const [ref, cash, username] = refNo.split('.');

  await discord({ embeds: [{ title: '✅ Recharge paid', color: 0x22c55e, timestamp: new Date().toISOString(), fields: [
    { name: 'Username', value: '`' + username + '`', inline: true },
    { name: 'Game Cash', value: String(cash), inline: true },
    { name: 'Paid', value: `${pr.currency} ${pr.amount}`, inline: true },
    { name: 'Order', value: ref, inline: true },
    { name: 'Email', value: String(pr.email || '-').replace(/^(.).*(@.*)$/, '$1***$2'), inline: true } ] }] });

  if (pr.email) await mail(pr.email, `Legend Aegis recharge confirmed (${ref})`,
    `<p>Thank you! Your payment was received.</p><p><b>${cash} Game Cash</b> for account <b>${username}</b> is being credited.</p><p>Order: ${ref}</p>`);
  return res.status(200).json({ ok: true });
};
