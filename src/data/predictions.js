/**
 * Predictions Adarshh Panndey made on record, researched October 2026 from his YouTube videos (Hindi
 * captions, translated) and checked against news reports.
 *
 * Rules for status: 'came-true' only when the video was PUBLISHED BEFORE the outcome and the outcome is
 * documented by a news or reference source (linked in `outcome.source`). Clips uploaded after the event
 * (for example the Nitish Kumar and Assam election clips) stay off this list until the client supplies the
 * original, earlier recording. 'awaiting' = the outcome date has not arrived yet.
 * `said` is a faithful English translation of his words; `quote` is the short headline version.
 */
export const predictions = [
  {
    id: 'bengal-2026', status: 'came-true', area: 'Politics', videoId: '_YtIBYBKjnA', format: 'short', date: '2026-05-01',
    title: 'BJP will win West Bengal',
    quote: '“There is a 99% chance the BJP comes to power in Bengal this time.”',
    said: 'Asked for his Bengal prediction, he said the BJP was coming this year, with a 99% chance, and that the numbers and cycle of the leadership then in power did not look favourable.',
    outcome: {date: '2026-05-04', text: 'Counting on 4 May 2026 gave the BJP a clear majority (about 207 of 294 seats), ending the TMC’s 15-year rule.', source: 'https://www.indiatvnews.com/west-bengal/news-west-bengal-assembly-election-results-2026-live-updates-bjp-tmc-mamata-banerjee-suvendu-adhikari-left-congress-bhabanipur-nandigram-counting-of-votes-1039773', sourceName: 'India TV'},
  },
  {
    id: 'gold-2026', status: 'came-true', area: 'Gold & markets', videoId: 'wp89ti24fg4', format: 'short', date: '2025-12-02',
    title: 'Gold will reach ₹1.4–1.5 lakh in 2026',
    quote: '“Next year gold will go to 140, 150. It will.”',
    said: 'In December 2025 he said that because 2026 is a Year 1, gold prices would run, reaching ₹1.4–1.5 lakh per 10 grams, and that silver would rise sharply over 2026–27.',
    outcome: {date: '2026-08-24', text: 'Gold crossed ₹1.5 lakh per 10 grams in 2026, with domestic prices peaking near ₹1.6 lakh in August.', source: 'https://m.thewire.in/article/ptiprnews/gold-near-record-highs-why-indian-investors-are-moving-from-lockers-to-demat-accounts', sourceName: 'The Wire'},
  },
  {
    id: 'war-2026', status: 'came-true', area: 'World', videoId: '0uHrtpRwe2E', format: 'short', date: '2026-01-28',
    title: 'A war would break out in 2026, outside India',
    quote: '“The chances of war are high this year.”',
    said: 'In late January 2026 he said 2026, a Year 1 of ego and power, raised the chances of war between countries, and that it would be seen outside India.',
    outcome: {date: '2026-02-28', text: 'On 28 February 2026 the United States and Israel began strikes on Iran, starting the 2026 Iran war.', source: 'https://www.britannica.com/event/2026-Iran-war', sourceName: 'Britannica'},
  },
  {
    id: 'ipl-2026', status: 'came-true', area: 'Cricket', videoId: 'B28thRHiU9M', format: 'short', date: '2026-04-17',
    title: 'Vaibhav Suryavanshi would dominate IPL 2026',
    quote: '“New faces will rise this season. Vaibhav Suryavanshi will be everywhere.”',
    said: 'Early in the season he said young players would take over IPL 2026 and named Vaibhav Suryavanshi among the names that would “run” this year.',
    outcome: {date: '2026-05-31', text: 'At 15, Vaibhav Suryavanshi finished IPL 2026 with the Orange Cap (776 runs) and the MVP award, the youngest Orange Cap winner in IPL history.', source: 'https://sports.yahoo.com/articles/ipl-2026-awards-list-full-184814541.html', sourceName: 'Yahoo Sports'},
  },
  {
    id: 'cjp-2026', status: 'came-true', area: 'Politics', videoId: '3a47xx86EMY', format: 'video', date: '2026-10-10',
    title: 'Cockroach Janta Party founder would face government restrictions',
    quote: '“He may face government-related or legal challenges this year.”',
    said: 'Reading the numbers of Abhijeet Dipke (Mulank 2, Bhagyank 8) and his party’s founding date, he said the name did not support him and that restrictions from the government or legal challenges were possible this year.',
    outcome: {date: '2026-10-16', text: 'Six days later, Delhi Police took Abhijeet Dipke into preventive detention ahead of a planned Cockroach Janta Party protest at Connaught Place.', source: 'https://www.cnn.com/2026/10/16/asia/india-police-cockroach-arrest-intl', sourceName: 'CNN'},
  },
  {
    id: 'suryavanshi-captain', status: 'awaiting', area: 'Cricket', videoId: 'Zvw1sWZQG4w', format: 'short', date: '2026-06-20', views: 58779,
    title: 'Vaibhav Suryavanshi will lead the Indian team',
    quote: '“In the coming time, Vaibhav Suryavanshi is going to lead the India team.”',
    said: 'He reads Vaibhav’s name total as 1 (the Sun, leadership) and his birth date, 27 March 2011, as Mulank 9 (Mars, speed and aggression).',
  },
  {
    id: 'ramayana', status: 'awaiting', area: 'Films', videoId: 'A3sRcYjn9sc', format: 'short', date: '2026-10-13',
    title: 'Ramayana will be a record-breaking blockbuster, with controversy',
    quote: '“It will be record-breaking, a blockbuster, and it will bring controversy too.”',
    said: 'The title totals 7 (spirituality, growth) and the release date totals 8 (Saturn): hard work and controversy, but a superhit.',
  },
  {
    id: 'gold-2027', status: 'awaiting', area: 'Gold & markets', videoId: 'Bb9ckvK4rKk', format: 'short', date: '2026-07-01',
    title: 'Gold will reach ₹2.1 lakh in 2027; silver and copper will surge',
    quote: '“In 2027 it will go even higher. It will hit 210.”',
    said: 'He expects gold around ₹2.1 lakh per 10 grams in 2027 and a sharp rise in silver and copper, while advising people to consult a financial adviser before investing.',
  },
  {
    id: 'up-2027', status: 'awaiting', area: 'Politics', videoId: 'QbC3uSed7ZY', format: 'video', date: '2026-06-10',
    title: 'UP 2027 will be a close fight, with Mayawati’s influence on the result',
    quote: '“It will not be a one-sided contest.”',
    said: 'On Anuj Srivastava’s podcast he said the 2027 Uttar Pradesh election would be tightly fought, with signs of coalition politics and Mayawati able to influence who forms the government.',
  },
];

export const predictionStats = () => {
  const cameTrue = predictions.filter((p) => p.status === 'came-true');
  return {cameTrue: cameTrue.length, total: predictions.length, awaiting: predictions.length - cameTrue.length};
};
