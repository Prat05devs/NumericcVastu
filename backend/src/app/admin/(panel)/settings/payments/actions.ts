'use server';
import {redirect} from 'next/navigation';
import {can, requireAdmin} from '../../../../../lib/auth.ts';
import {audit} from '../../../../../lib/audit.ts';
import {EncryptionKeyError} from '../../../../../lib/crypto.ts';
import {getSecret, paypalSettings, razorpaySettings, setSecret, setSetting, testPaypal, testRazorpay, type PaypalMode, type RazorpayMode} from '../../../../../lib/settings.ts';

const PAGE = '/admin/settings/payments';
const done = (error: string, ok = 'Saved.') => redirect(`${PAGE}?${error ? `error=${encodeURIComponent(error)}` : `ok=${encodeURIComponent(ok)}`}`);
const keyError = (e: unknown) => (e instanceof EncryptionKeyError ? 'SETTINGS_ENCRYPTION_KEY is not set on the server, so keys cannot be saved.' : (e as Error).message);

export async function saveRazorpay(form: FormData) {
  const admin = await requireAdmin(can.settings);
  let error = '';
  try {
    const current = await razorpaySettings();
    const next = {...current, international: form.get('international') === 'on'};
    for (const mode of ['test', 'live'] as RazorpayMode[]) {
      const keyId = String(form.get(`${mode}KeyId`) ?? '').trim();
      if (keyId && !keyId.startsWith(`rzp_${mode}_`)) throw new Error(`The ${mode} key id should start with rzp_${mode}_.`);
      next[mode] = {keyId};
      await setSecret(`razorpay.${mode}.keySecret`, String(form.get(`${mode}KeySecret`) ?? ''), admin.id);
      await setSecret(`razorpay.${mode}.webhookSecret`, String(form.get(`${mode}WebhookSecret`) ?? ''), admin.id);
    }
    await setSetting('payments.razorpay', next, admin.id);
    await audit(admin.id, 'settings.razorpay.keys', 'settings', 'payments.razorpay', {testKeyId: next.test.keyId, liveKeyId: next.live.keyId, international: next.international});
  } catch (e) { error = keyError(e); }
  done(error, 'Razorpay keys saved.');
}

export async function savePaypal(form: FormData) {
  const admin = await requireAdmin(can.settings);
  let error = '';
  try {
    const next = await paypalSettings();
    for (const mode of ['sandbox', 'live'] as PaypalMode[]) {
      next[mode] = {clientId: String(form.get(`${mode}ClientId`) ?? '').trim()};
      await setSecret(`paypal.${mode}.clientSecret`, String(form.get(`${mode}ClientSecret`) ?? ''), admin.id);
    }
    await setSetting('payments.paypal', next, admin.id);
    await audit(admin.id, 'settings.paypal.keys', 'settings', 'payments.paypal', {sandboxClientId: next.sandbox.clientId, liveClientId: next.live.clientId});
  } catch (e) { error = keyError(e); }
  done(error, 'PayPal credentials saved.');
}

/** Switches a provider between test and live. Going live needs live keys and an explicit confirmation. */
export async function switchMode(form: FormData) {
  const admin = await requireAdmin(can.settings);
  const provider = String(form.get('provider'));
  const mode = String(form.get('mode'));
  let error = '';
  try {
    if (mode === 'live' && form.get('confirm') !== 'on') throw new Error('Tick the confirmation to switch to live payments.');
    if (provider === 'razorpay' && (mode === 'test' || mode === 'live')) {
      const current = await razorpaySettings();
      if (mode === 'live' && (!current.live.keyId || !(await getSecret('razorpay.live.keySecret')))) throw new Error('Add the Razorpay live key id and secret before going live.');
      await setSetting('payments.razorpay', {...current, mode}, admin.id);
    } else if (provider === 'paypal' && (mode === 'sandbox' || mode === 'live')) {
      const current = await paypalSettings();
      if (mode === 'live' && (!current.live.clientId || !(await getSecret('paypal.live.clientSecret')))) throw new Error('Add the PayPal live client id and secret before going live.');
      await setSetting('payments.paypal', {...current, mode}, admin.id);
    } else throw new Error('Unknown provider or mode.');
    await audit(admin.id, 'settings.payments.mode', 'settings', provider, {mode});
  } catch (e) { error = keyError(e); }
  done(error, `${provider === 'razorpay' ? 'Razorpay' : 'PayPal'} is now in ${mode} mode.`);
}

export async function testConnection(form: FormData) {
  await requireAdmin(can.settings);
  const provider = String(form.get('provider'));
  const mode = String(form.get('mode'));
  let result;
  try {
    result = provider === 'razorpay' ? await testRazorpay(mode as RazorpayMode) : await testPaypal(mode as PaypalMode);
  } catch (e) { result = {ok: false, message: keyError(e)}; }
  done(result.ok ? '' : result.message, result.message);
}
