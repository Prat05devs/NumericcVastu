/**
 * Questions asked at checkout, per offer (ids from data/offers.ts). Researched October 2026 from what Indian
 * numerology and Vastu practitioners ask before a session: full name as on documents, the name in daily use,
 * date, time and place of birth, plus service-specific details. Anything a visitor cannot type (floor plans,
 * signature photos) is collected on WhatsApp after booking.
 *
 * Field: {name, label, type: 'text'|'date'|'time'|'select'|'textarea'|'tel'|'number', required, options,
 *         placeholder, hint, half (two per row on wide screens)}
 */

const birth = (who = 'your', prefix = '') => [
  {name: `${prefix}fullName`, label: `${cap(who)} full name, as on documents`, type: 'text', required: true, placeholder: 'e.g. Priya Sharma', hint: 'The spelling on Aadhaar, PAN or passport.'},
  {name: `${prefix}dob`, label: 'Date of birth', type: 'date', required: true, half: true},
  {name: `${prefix}tob`, label: 'Time of birth', type: 'time', half: true, hint: 'Leave blank if not known.'},
  {name: `${prefix}pob`, label: 'Place of birth', type: 'text', required: true, placeholder: 'City, state', half: true},
  {name: `${prefix}gender`, label: 'Gender', type: 'select', required: true, options: ['Female', 'Male', 'Other'], half: true, hint: 'Used for the Kua number.'},
];
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

const nameInUse = {name: 'nameInUse', label: 'Name you use day to day, if different', type: 'text', placeholder: 'e.g. how you sign or are known at work', hint: 'Optional.'};
const question = (label = 'What would you like to ask Adarshh?') => ({name: 'question', label, type: 'textarea', required: true, placeholder: 'A few lines about your situation helps him prepare.'});

/** Session preferences asked for every consultation. */
export const sessionFields = (offerId) => [
  {name: 'mode', label: 'How would you like to meet?', type: 'select', required: true, half: true, options: offerId.endsWith('vastu')
    ? ['Online, with floor plan and photos', 'Site visit (Delhi NCR; travel confirmed separately)']
    : ['Video call (Google Meet / Zoom)', 'Phone call', 'In person at the Rohini, Delhi office']},
  {name: 'language', label: 'Preferred language', type: 'select', required: true, half: true, options: ['Hindi', 'English', 'Either']},
  {name: 'preferredDate', label: 'Preferred date', type: 'date', required: true, half: true, future: true, hint: 'The team confirms the exact slot.'},
  {name: 'preferredTime', label: 'Preferred time', type: 'select', required: true, half: true, options: ['Morning (10 am to 1 pm)', 'Afternoon (1 pm to 5 pm)', 'Evening (5 pm to 8 pm)', 'Any time']},
];

export const intake = {
  'consult-blueprint': {title: 'Your birth details', fields: [...birth(), nameInUse, question()]},
  'consult-career': {title: 'Your birth and career details', fields: [...birth(), nameInUse,
    {name: 'occupation', label: 'Current work or study', type: 'text', required: true, placeholder: 'e.g. Software engineer, 4 years', half: true},
    {name: 'education', label: 'Highest education', type: 'text', placeholder: 'e.g. B.Com', half: true},
    question('What career decision are you facing?')]},
  'consult-relationship': {title: 'Details for both of you', fields: [...birth('your'),
    {name: 'partnerHeading', type: 'heading', label: 'Your partner or prospective match'},
    ...birth('their', 'partner_'),
    {name: 'relationshipStage', label: 'Where are you in the relationship?', type: 'select', required: true, options: ['Considering a match', 'Engaged', 'Married', 'In a relationship', 'Going through difficulties']},
    question('What would you like to understand?')]},
  'consult-business': {title: 'Your details and your business', fields: [...birth('your'),
    {name: 'businessName', label: 'Business or brand name (current or proposed)', type: 'text', required: true, half: true},
    {name: 'businessDate', label: 'Date of incorporation or launch', type: 'date', half: true, hint: 'If already started.'},
    {name: 'industry', label: 'Industry', type: 'text', required: true, placeholder: 'e.g. Real estate, apparel, tech', half: true},
    {name: 'partners', label: 'Partners’ names and dates of birth', type: 'textarea', placeholder: 'One partner per line, if any'},
    question('What decision do you need help with?')]},
  'consult-baby-name': {title: 'Details for the baby and parents', fields: [
    {name: 'babyStatus', label: 'Has the baby been born?', type: 'select', required: true, options: ['Yes', 'Not yet (expected date below)']},
    {name: 'babyDob', label: 'Baby’s date of birth, or expected date', type: 'date', required: true, half: true},
    {name: 'babyTob', label: 'Time of birth', type: 'time', half: true, hint: 'If born.'},
    {name: 'babyPob', label: 'Place of birth', type: 'text', placeholder: 'City', half: true},
    {name: 'babyGender', label: 'Baby’s gender', type: 'select', options: ['Girl', 'Boy', 'Not known yet'], half: true},
    {name: 'surname', label: 'Surname the baby will carry', type: 'text', required: true, half: true},
    {name: 'letters', label: 'Preferred starting letters', type: 'text', placeholder: 'e.g. A, S, or from the rashi', half: true},
    {name: 'shortlist', label: 'Names you are already considering', type: 'textarea', placeholder: 'Optional'},
    {name: 'parentsHeading', type: 'heading', label: 'Parents'},
    {name: 'fatherName', label: 'Father’s full name', type: 'text', required: true, half: true},
    {name: 'fatherDob', label: 'Father’s date of birth', type: 'date', half: true},
    {name: 'motherName', label: 'Mother’s full name', type: 'text', required: true, half: true},
    {name: 'motherDob', label: 'Mother’s date of birth', type: 'date', half: true},
  ]},
  'consult-name': {title: 'Your name and birth details', fields: [...birth(),
    {name: 'documentSpellings', label: 'Spellings on your documents', type: 'textarea', required: true, placeholder: 'e.g. Aadhaar: Priya Sharma; PAN: Priya Sharmaa', hint: 'List any differences.'},
    nameInUse,
    {name: 'reason', label: 'Why are you considering a name correction?', type: 'select', required: true, options: ['Career or recognition', 'Business or brand', 'Marriage (surname change)', 'Personal brand or stage name', 'Checking a correction suggested elsewhere', 'Other']},
    question('Anything else Adarshh should know?')]},
  'consult-mobile': {title: 'Your birth details and numbers', fields: [...birth(),
    {name: 'mobiles', label: 'Mobile numbers to analyse', type: 'textarea', required: true, placeholder: 'One per line, e.g. 98xxxxxx12 (personal)', hint: 'Include every number you use.'},
    {name: 'purpose', label: 'Main use of the number', type: 'select', required: true, options: ['Personal', 'Business', 'Both']},
    question('What would you like to know?')]},
  'consult-watch': {title: 'Your birth details and your watch', fields: [...birth(),
    {name: 'wrist', label: 'Which wrist do you wear a watch on?', type: 'select', required: true, half: true, options: ['Left', 'Right', 'I don’t wear one yet']},
    {name: 'watch', label: 'Your watch (dial colour, shape, strap)', type: 'text', placeholder: 'e.g. Round black dial, steel strap', half: true},
    question()]},
  'consult-signature': {title: 'Your birth details and signature', fields: [...birth(), nameInUse,
    {name: 'signatureUse', label: 'Where do you mainly sign?', type: 'select', required: true, options: ['Personal documents', 'Business and contracts', 'Both']},
    {name: 'signatureNote', type: 'note', label: 'After booking, you’ll send a clear photo of your signature on WhatsApp.'},
    question()]},
  'consult-home-vastu': {title: 'Your home and the residents', fields: [...birth('the owner’s'),
    {name: 'propertyType', label: 'Property type', type: 'select', required: true, half: true, options: ['Apartment / flat', 'Independent house', 'Villa', 'Plot (yet to build)', 'Rented home']},
    {name: 'propertyCity', label: 'City', type: 'text', required: true, half: true},
    {name: 'facing', label: 'Main door facing (if known)', type: 'select', half: true, options: ['Not sure', 'North', 'North-east', 'East', 'South-east', 'South', 'South-west', 'West', 'North-west']},
    {name: 'floorPlan', label: 'Do you have a floor plan?', type: 'select', required: true, half: true, options: ['Yes, I’ll share it on WhatsApp', 'No, I need help drawing one']},
    {name: 'residents', label: 'Other residents’ names and dates of birth', type: 'textarea', placeholder: 'Optional, one per line'},
    question('What issues are you facing at home?')]},
  'consult-office-vastu': {title: 'Your workspace and the owner', fields: [...birth('the owner’s'),
    {name: 'businessName', label: 'Business name', type: 'text', required: true, half: true},
    {name: 'propertyType', label: 'Workspace type', type: 'select', required: true, half: true, options: ['Office', 'Shop / showroom', 'Clinic', 'Factory / warehouse', 'Co-working desk']},
    {name: 'propertyCity', label: 'City', type: 'text', required: true, half: true},
    {name: 'floorPlan', label: 'Do you have a floor plan?', type: 'select', required: true, half: true, options: ['Yes, I’ll share it on WhatsApp', 'No, I need help drawing one']},
    question('What would you like to improve at work?')]},
  course: {title: 'About you as a learner', fields: [
    {name: 'fullName', label: 'Full name, as it should appear on your certificate', type: 'text', required: true},
    {name: 'dob', label: 'Date of birth', type: 'date', required: true, half: true, hint: 'Used in class exercises on your own chart.'},
    {name: 'pob', label: 'Place of birth', type: 'text', half: true, placeholder: 'City'},
    {name: 'occupation', label: 'Current work or study', type: 'text', required: true, half: true},
    {name: 'level', label: 'Your numerology knowledge', type: 'select', required: true, half: true, options: ['Complete beginner', 'I know the basics', 'Already practising']},
    {name: 'batch', label: 'Batch preference', type: 'select', required: true, half: true, options: ['Weekdays', 'Weekends', 'Either']},
    {name: 'language', label: 'Preferred teaching language', type: 'select', required: true, half: true, options: ['Hindi', 'English', 'Either']},
    {name: 'goal', label: 'What do you want from the course?', type: 'select', required: true, options: ['Understand numerology for myself', 'Start consulting professionally', 'Add numerology to my current practice', 'Build a personal brand as a numerologist']},
    {name: 'question', label: 'Anything you’d like to ask before you start?', type: 'textarea', placeholder: 'Optional'},
  ]},
};

export const intakeFor = (offer) => (offer.kind === 'course' ? intake.course : intake[offer.id] || intake['consult-blueprint']);
