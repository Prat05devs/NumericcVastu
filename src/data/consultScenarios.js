/**
 * Everyday situations that lead people to each consultation, shown around the consultation in the
 * Consultations page hero. Keyed by offer id in data/offers.ts; six per consultation keeps the layout balanced.
 *
 * Researched October 2026 from the triggers Indian numerology and Vastu practitioners commonly list, and from
 * the topics Adarshh's own YouTube and Instagram audience responds to (mobile-number combinations, name
 * correction, missing numbers, marriage timing, Ganesha at the entrance, photos of ancestors, west direction).
 * Phrase each as a question the visitor recognises; never promise an outcome.
 */
export const consultScenarios = {
  'consult-blueprint': [
    'Working hard but results never match the effort?',
    'The same problems keep repeating every year?',
    'Facing a big decision and can’t choose?',
    'What do your Mulank and Bhagyank say?',
    'Unsure what your natural strengths are?',
    'Want to plan the year ahead with clarity?',
  ],
  'consult-career': [
    'Torn between a job and starting a business?',
    'Promotion or salary hike keeps getting delayed?',
    'Thinking of switching careers but scared to move?',
    'Choosing a stream or course after Class 12?',
    'Interviews go well but offers don’t come?',
    'Not sure when is the right time to make the move?',
  ],
  'consult-relationship': [
    'Frequent fights or misunderstandings at home?',
    'Checking compatibility before saying yes?',
    'Marriage keeps getting delayed?',
    'Families can’t agree on the match?',
    'Feeling distant from your partner lately?',
    'Thinking about a second chance in love?',
  ],
  'consult-business': [
    'Launching a new business, brand or startup?',
    'Good product, but sales just won’t pick up?',
    'Choosing the right partner or co-founder?',
    'Finalising a business name or logo?',
    'Picking a date to launch, sign or open?',
    'Money coming in but never staying?',
  ],
  'consult-baby-name': [
    'Expecting a baby in the coming months?',
    'Shortlisted names but can’t pick one?',
    'Want a name that suits the birth date?',
    'Need a name starting with a specific letter?',
    'Family can’t agree on the name?',
    'Want to know what each name option means?',
  ],
  'consult-name': [
    'Talented and hard-working, but recognition never comes?',
    'Changing your surname after marriage?',
    'Name spelt differently on Aadhaar, PAN or passport?',
    'Building a personal brand, stage or screen name?',
    'Someone suggested adding a letter to your name?',
    'Your name number clashes with your birth number?',
  ],
  'consult-mobile': [
    'Buying a new SIM or a VIP number?',
    'Your number is full of 4s, 8s or zeros?',
    'Using the same number for business and personal life?',
    'Calls on this number rarely bring good news?',
    'Number total doesn’t suit your Mulank?',
    'Thinking of changing a number you’ve had for years?',
  ],
  'consult-watch': [
    'Not sure which wrist to wear your watch on?',
    'Keeping a stopped watch or clock at home?',
    'Received a watch as a gift and unsure about it?',
    'Choosing the dial colour, shape or size?',
    'Always running late, however well you plan?',
    'Buying a watch for an important milestone?',
  ],
  'consult-signature': [
    'Your signature slopes downward?',
    'You cut through or strike off your own name?',
    'Your signature changes every time you sign?',
    'Signing a big contract or property deal soon?',
    'Starting a new role and want a fresh signature?',
    'Want a signature that looks confident and clear?',
  ],
  'consult-home-vastu': [
    'Buying, building or renting a new home?',
    'Frequent arguments or tension in the family?',
    'Restless sleep or health issues in one room?',
    'Unsure about the main door or kitchen direction?',
    'Not sure where to place Ganesha or ancestors’ photos?',
    'Want corrections without breaking walls?',
  ],
  'consult-office-vastu': [
    'Opening a new office, shop or clinic?',
    'Staff conflicts or people leaving often?',
    'Where should the cash box or locker go?',
    'Footfall and sales dropping at your shop?',
    'Moving into a new workspace soon?',
    'Which direction should you face while working?',
  ],
};

/** Short labels for each consultation, used by the Consultations page hero and the site guide. */
export const consultShortNames = {'consult-blueprint':'Personal blueprint','consult-career':'Career','consult-relationship':'Relationships','consult-business':'Business','consult-baby-name':'Baby name','consult-name':'Name correction','consult-mobile':'Mobile number','consult-watch':'Wristwatch','consult-signature':'Signature','consult-home-vastu':'Home Vastu','consult-office-vastu':'Office Vastu'};
