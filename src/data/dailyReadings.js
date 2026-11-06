/**
 * Daily readings, written once and picked automatically each day (lib/daily.js). For Adarshh's review: edit any line
 * here and the site updates on the next deploy. All guidance is traditional and interpretive, never a guarantee.
 *
 * DAY_ENERGY: the day's combined number (your Mulank + the date's universal number, reduced) sets the theme.
 * GOCHAR: classical Chandra gochar, by the house the Moon occupies counted from your rashi (1 = your own sign).
 */
export const DAY_ENERGY = {
  1: {theme: 'A day to begin', line: 'Fresh starts carry weight today. Take the first step you have been postponing.',
    work: 'Lead the conversation, pitch the idea, send the proposal. Initiative is noticed.', money: 'Good for starting a savings habit or an investment plan you have already researched.',
    love: 'Say clearly what you want; others respond well to honest directness today.', wellbeing: 'Morning sunlight and a brisk walk set the tone for the whole day.',
    do: 'Start one important task before noon', avoid: 'Waiting for someone else to make the first move', affirmation: 'I begin with confidence and trust my direction.'},
  2: {theme: 'A day for partnership', line: 'Things move through people today. Cooperation does more than force.',
    work: 'Collaborate, listen and support a colleague; joint efforts bring the result.', money: 'Review shared expenses and agreements; small adjustments now prevent friction later.',
    love: 'Gentle words and patience go a long way. Make time for the people close to you.', wellbeing: 'Stay hydrated and keep evenings calm; emotions run closer to the surface.',
    do: 'Ask for help or offer it', avoid: 'Taking quick offence or deciding in a mood', affirmation: 'I move gently and invite good people closer.'},
  3: {theme: 'A day to learn and express', line: 'Ideas, teaching and good advice flow easily. Share what you know.',
    work: 'Present, write, teach or plan. A mentor or senior may offer useful guidance.', money: 'Spend on learning rather than on show; knowledge pays back today.',
    love: 'Laughter and conversation bring people together. Plan something you both enjoy.', wellbeing: 'Keep meals light and regular; avoid overdoing sweets.',
    do: 'Share one useful idea with someone', avoid: 'Lecturing when a question would work better', affirmation: 'I speak with wisdom and learn from everyone I meet.'},
  4: {theme: 'A day for structure', line: 'Solid groundwork beats shortcuts. Expect the unexpected and stay steady.',
    work: 'Organise, fix systems, finish pending paperwork. Plans may change; adapt calmly.', money: 'Avoid impulsive purchases and risky bets. Check details twice.',
    love: 'Be dependable rather than dramatic; small reliable gestures matter most.', wellbeing: 'Sleep on time and keep your routine; the mind can feel restless.',
    do: 'Clear one long-pending task', avoid: 'Sudden decisions and arguments over small things', affirmation: 'I build steadily, one sure step at a time.'},
  5: {theme: 'A day of movement', line: 'Conversations, deals and short trips bring opportunity. Stay flexible.',
    work: 'Network, negotiate and follow up. Quick thinking wins today.', money: 'Good for trade and business conversations; read the fine print before you sign.',
    love: 'Keep things light and playful; a change of scene refreshes a relationship.', wellbeing: 'Breathing exercises help a busy mind. Do not skip meals on the go.',
    do: 'Make the call you have been delaying', avoid: 'Starting five things and finishing none', affirmation: 'I welcome change and move with it gracefully.'},
  6: {theme: 'A day for home and harmony', line: 'Family, beauty and comfort are favoured. Responsibilities feel lighter when shared.',
    work: 'Creative work, design and client care go well. Smooth over a disagreement.', money: 'Spend on the home or a thoughtful gift, within a budget you set first.',
    love: 'A warm day for relationships. Express appreciation openly.', wellbeing: 'Rest, music and a clean, tidy space restore your energy.',
    do: 'Do something kind for someone at home', avoid: 'Overindulging or overspending on comfort', affirmation: 'I create harmony wherever I go.'},
  7: {theme: 'A day for reflection', line: 'Go inward. Research, prayer and quiet thinking bring clarity.',
    work: 'Study, analyse and plan rather than push. Answers come through observation.', money: 'Hold big financial decisions for another day; gather information instead.',
    love: 'Give each other space; a quiet evening together says more than words.', wellbeing: 'Meditation or a walk alone settles the mind. Limit screens at night.',
    do: 'Spend twenty quiet minutes with your thoughts', avoid: 'Doubting yourself or withdrawing completely', affirmation: 'I trust the quiet voice within me.'},
  8: {theme: 'A day for effort and results', line: 'Hard work is rewarded, but patiently. Discipline is your strongest tool.',
    work: 'Handle responsibility, numbers and long-term plans. Persistence pays off.', money: 'Good for clearing dues and long-term planning; avoid quick-profit schemes.',
    love: 'Show love through reliability. Do not let work crowd out the people who matter.', wellbeing: 'Mind your back and joints; stretch and rest well.',
    do: 'Finish what you started, properly', avoid: 'Taking short cuts or carrying everything alone', affirmation: 'My patient effort builds lasting results.'},
  9: {theme: 'A day of courage and completion', line: 'Energy is high. Finish, let go and act with generosity.',
    work: 'Complete projects, solve problems, stand up for what is right.', money: 'Charity and settling old accounts bring a sense of lightness today.',
    love: 'Passion is strong; keep your temper in check and be generous with kindness.', wellbeing: 'Channel energy into exercise; avoid rushing and minor injuries.',
    do: 'Close one chapter you have been holding open', avoid: 'Anger and hasty words', affirmation: 'I act with courage and release what no longer serves me.'},
};

/** How your Mulank meets today's number (the NumericcVaastu compatibility chart). */
export const TONE = {
  friend: {label: 'Supportive', energy: 4, note: 'Today’s number is friendly to yours, so effort flows more easily.'},
  shortTerm: {label: 'Mixed', energy: 3, note: 'Good for short tasks; keep long commitments for another day.'},
  neutral: {label: 'Steady', energy: 3, note: 'A neutral day for your number: steady effort brings steady results.'},
  enemy: {label: 'Take care', energy: 2, note: 'Today’s number is not friendly to yours. Go slower, double-check and stay calm.'},
};

/** Chandra gochar: the Moon in the nth house from your rashi. */
export const GOCHAR = {
  1: {theme: 'Moon in your own sign', energy: 4, line: 'You feel more like yourself. Comfort, good food and support come easily.', work: 'A good day to be visible and take personal initiative.', money: 'Steady; small comforts are well spent.', love: 'Warmth from family and friends.', do: 'Begin something personal', avoid: 'Over-sensitivity to small remarks'},
  2: {theme: 'Moon in the 2nd house', energy: 2, line: 'Expenses and family matters need attention. Speak carefully.', work: 'Keep to routine work and avoid confrontations.', money: 'Spending rises; avoid lending or big purchases.', love: 'Choose words gently at home.', do: 'Track today’s spending', avoid: 'Harsh speech and impulse buys'},
  3: {theme: 'Moon in the 3rd house', energy: 5, line: 'Confidence and courage are high. Effort turns into success.', work: 'Push forward with plans, calls and short trips.', money: 'Gains through your own effort.', love: 'Siblings and friends bring good news.', do: 'Take the bold step', avoid: 'Letting the momentum slip'},
  4: {theme: 'Moon in the 4th house', energy: 2, line: 'The mind may feel uneasy. Home and peace of mind need care.', work: 'Avoid big changes; finish what is in hand.', money: 'Hold property and vehicle decisions.', love: 'Spend calm time with your mother or elders.', do: 'Rest and stay close to home', avoid: 'Worrying over what you cannot control'},
  5: {theme: 'Moon in the 5th house', energy: 2, line: 'Plans may meet small obstacles; think twice before deciding.', work: 'Double-check work before you submit it.', money: 'Avoid speculation and risky bets.', love: 'Be patient with children and loved ones.', do: 'Pray, read or reflect', avoid: 'Speculation and hasty choices'},
  6: {theme: 'Moon in the 6th house', energy: 5, line: 'You overcome obstacles and rivals. Health and routine improve.', work: 'Clear backlogs, win disputes, solve problems.', money: 'Debts and dues can be settled.', love: 'Service and small acts of care strengthen bonds.', do: 'Tackle the hardest task first', avoid: 'Skipping meals or rest'},
  7: {theme: 'Moon in the 7th house', energy: 4, line: 'Partnerships, meetings and travel go well.', work: 'Good for deals, clients and joint work.', money: 'Gains through partners.', love: 'Harmony with your spouse or partner.', do: 'Meet people and agree terms', avoid: 'Being rigid in negotiations'},
  8: {theme: 'Moon in the 8th house', energy: 1, line: 'A sensitive day (Chandrashtama). Move slowly and avoid risks.', work: 'Postpone launches and important signatures if you can.', money: 'Guard against losses; avoid new commitments.', love: 'Avoid arguments; patience protects relationships.', do: 'Keep a low profile and pray', avoid: 'Travel, risks and new beginnings'},
  9: {theme: 'Moon in the 9th house', energy: 3, line: 'Mixed results; faith and patience help. Delays are possible.', work: 'Stick to the plan; seek a mentor’s advice.', money: 'Moderate; avoid unnecessary expenses.', love: 'Respect elders and teachers.', do: 'Visit a temple or do a good deed', avoid: 'Impatience with delays'},
  10: {theme: 'Moon in the 10th house', energy: 5, line: 'Work and reputation shine. Recognition is likely.', work: 'Lead, present and take charge of important work.', money: 'Gains through your career.', love: 'Balance ambition with family time.', do: 'Ask for what you deserve', avoid: 'Neglecting home for work'},
  11: {theme: 'Moon in the 11th house', energy: 5, line: 'Gains, good news and wishes fulfilled. A happy day.', work: 'Networks and seniors support you.', money: 'Income and gains are favoured.', love: 'Friends and social plans bring joy.', do: 'Reach out to your network', avoid: 'Overspending in celebration'},
  12: {theme: 'Moon in the 12th house', energy: 2, line: 'Expenses and fatigue are possible. Rest and spirituality help.', work: 'Work quietly behind the scenes.', money: 'Expect outgoings; avoid lending.', love: 'Give people space and rest well.', do: 'Sleep early and meditate', avoid: 'Wasteful spending and late nights'},
};

/** Planet mantras by ruling number (1 Sun … 9 Mars). */
export const MANTRA = {1: 'Om Suryaya Namah', 2: 'Om Somaya Namah', 3: 'Om Brihaspataye Namah', 4: 'Om Rahave Namah', 5: 'Om Budhaya Namah', 6: 'Om Shukraya Namah', 7: 'Om Ketave Namah', 8: 'Om Shanaischaraya Namah', 9: 'Om Angarakaya Namah'};
/** Swatches for lucky colours. */
export const COLOUR_SWATCH = {1: ['Red', '#c8323b'], 2: ['Milky white', '#f4efe6'], 3: ['Yellow', '#f2c230'], 4: ['Dark grey', '#4a4a52'], 5: ['Green', '#2f9a5c'], 6: ['White', '#ffffff'], 7: ['Grey', '#9a9aa3'], 8: ['Navy blue', '#1f2f5c'], 9: ['Coral red', '#e2553f']};

/** Festivals for New Delhi, verbatim from Drik Panchang (drikpanchang.com festival pages, read 6 November 2026). */
export const FESTIVALS = [
  ['2026-11-06', 'Dhanteras'], ['2026-11-08', 'Diwali · Lakshmi Puja'], ['2026-11-10', 'Govardhan Puja'], ['2026-11-11', 'Bhai Dooj'], ['2026-11-15', 'Chhath Puja'],
  ['2026-11-20', 'Dev Uthani Ekadashi'], ['2026-11-24', 'Kartika Purnima · Dev Diwali'], ['2026-12-14', 'Vivah Panchami'], ['2026-12-20', 'Gita Jayanti'],
  ['2027-01-14', 'Lohri'], ['2027-01-15', 'Makar Sankranti · Pongal'], ['2027-02-11', 'Vasant Panchami'], ['2027-03-06', 'Maha Shivaratri'], ['2027-03-21', 'Holika Dahan'], ['2027-03-22', 'Holi'],
  ['2027-04-07', 'Chaitra Navratri begins'], ['2027-04-15', 'Ram Navami'], ['2027-04-20', 'Hanuman Jayanti'], ['2027-05-09', 'Akshaya Tritiya'], ['2027-05-20', 'Buddha Purnima'],
  ['2027-07-18', 'Guru Purnima'], ['2027-08-17', 'Raksha Bandhan'], ['2027-08-25', 'Krishna Janmashtami'], ['2027-09-04', 'Ganesh Chaturthi'], ['2027-09-16', 'Pitru Paksha begins'],
  ['2027-09-29', 'Sarva Pitru Amavasya'], ['2027-09-30', 'Sharad Navratri begins'], ['2027-10-09', 'Dussehra'], ['2027-10-18', 'Karwa Chauth'], ['2027-10-27', 'Dhanteras'],
  ['2027-10-29', 'Diwali · Lakshmi Puja'], ['2027-10-30', 'Govardhan Puja'], ['2027-10-31', 'Bhai Dooj'], ['2027-11-04', 'Chhath Puja'], ['2027-11-10', 'Dev Uthani Ekadashi'],
  ['2027-11-13', 'Dev Diwali'], ['2027-11-14', 'Kartika Purnima'],
];
