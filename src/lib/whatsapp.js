/**
 * Builds the pre-written WhatsApp message a visitor sends to Adarshh, and the wa.me link that opens it.
 * No server is involved: the visitor's own WhatsApp sends the message, and Adarshh replies there.
 * WhatsApp formatting: *bold*, line breaks with \n.
 */

const formatDob = (iso) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {day: 'numeric', month: 'long', year: 'numeric'});
};

export function buildMessage({kind, offer, name, dob, city, time, language, level, situations = [], note}) {
  const lines = ['Namaste Adarshh ji 🙏', ''];
  if (kind === 'course' && offer) lines.push(`I would like to join the *${offer.name}*${offer.priceLabel ? ` (${offer.priceLabel})` : ''}.`);
  else if (offer) lines.push(`I would like to book a *${offer.name}*${offer.priceLabel ? ` (${offer.priceLabel})` : ''}.`);
  else lines.push('I have a question for you.');
  lines.push('');
  if (name) lines.push(`*Name:* ${name}`);
  if (dob) lines.push(`*Date of birth:* ${formatDob(dob)}`);
  if (city) lines.push(`*City:* ${city}`);
  if (level) lines.push(`*My current level:* ${level}`);
  if (time) lines.push(`*Preferred time:* ${time}`);
  if (language) lines.push(`*Preferred language:* ${language}`);
  if (situations.length || note) {
    lines.push('', kind === 'course' ? '*What I want to learn:*' : kind === 'question' ? '*My question:*' : '*What I need help with:*');
    situations.forEach((s) => lines.push(`• ${s.replace(/\?$/, '')}`));
    if (note) lines.push(note.trim());
  }
  lines.push('', kind === 'course' ? 'Please share the next batch dates and how to enrol.' : kind === 'question' ? 'Looking forward to your reply.' : 'Please let me know the available time and how to proceed.');
  lines.push('', '— Sent from numericcvaastu.com');
  return lines.join('\n');
}

export const whatsappUrl = (number, text) => `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
