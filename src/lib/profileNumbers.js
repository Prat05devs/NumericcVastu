import {readChart, reduce, relation} from './numerology.js';

/** Chaldean letter table printed in the supplied completed report. No letter has value 9. */
export const CHALDEAN = Object.fromEntries(['AIJQY', 'BKR', 'CGLS', 'DMT', 'EHNX', 'UVW', 'OZ', 'FP'].flatMap((letters, i) => [...letters].map(letter => [letter, i + 1])));

export function nameNumbers(name) {
  const clean = name.trim().replace(/\s+/g, ' ');
  if (!clean || clean.length > 120 || !/^[A-Za-z][A-Za-z .’'\-]*$/.test(clean)) {
    throw new Error('Enter your name in English letters for the Chaldean calculation (up to 120 characters).');
  }
  const words = clean.split(' ').map(word => {
    const letters = [...word.toUpperCase()].filter(letter => CHALDEAN[letter]).map(letter => ({letter, value: CHALDEAN[letter]}));
    const total = letters.reduce((sum, item) => sum + item.value, 0);
    return {word, letters, total, number: reduce(total)};
  }).filter(word => word.letters.length);
  const total = words.reduce((sum, word) => sum + word.total, 0);
  return {name: clean, words, total, number: reduce(total), first: words[0], letterCount: words.reduce((sum, word) => sum + word.letters.length, 0)};
}

/** Evaluate a national number only; country calling codes are deliberately excluded. */
export function phoneNumbers(phone, mulank, bhagyank, nameNumber) {
  if (typeof phone !== 'string' || !/^[0-9 ()-]+$/.test(phone)) throw new Error('Enter your national phone number without the country code.');
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) throw new Error('Enter a phone number with 7 to 15 digits, without the country code.');
  const total = [...digits].reduce((sum, digit) => sum + Number(digit), 0);
  const number = reduce(total);
  if (!number) throw new Error('Enter a phone number containing at least one non-zero digit.');
  return {digits, total, number, values: [...digits].map(Number), mulank: relation(mulank, number), bhagyank: relation(bhagyank, number), name: nameNumber ? relation(nameNumber, number) : null};
}

export function readProfile({dob, gender = '', name, phone, today = new Date()}) {
  const chart = readChart(dob, gender, today);
  const nameAnalysis = nameNumbers(name);
  return {...chart, nameAnalysis, phoneAnalysis: phoneNumbers(phone, chart.mulank, chart.bhagyank, nameAnalysis.number)};
}
