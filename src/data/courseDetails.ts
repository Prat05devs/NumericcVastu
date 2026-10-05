/**
 * Course detail-page content, keyed by offer id in offers.ts.
 * Prices, names and listed inclusions stay in offers.ts; this file only holds the long-form page copy.
 * Everything here is drawn from the existing website's course listings. Replace module outlines with the
 * approved lesson-by-lesson syllabus when Adarshh supplies it, and fill `facts` only with confirmed values:
 * a fact left null is not published.
 */
export type CourseModule = {title: string; summary: string; topics: string[]};
export type CourseFacts = {format: string | null; duration: string | null; language: string | null; nextCohort: string | null; access: string | null};
export type CourseDetail = {
  offerId: string;
  path: string;
  level: string;
  headline: string;
  learn: string[];
  requirements: string[];
  description: string[];
  whoFor: string[];
  modules: CourseModule[];
  syllabusConfirmed: boolean;
  certificate: string;
  facts: CourseFacts;
  ctaLabel: string;
  faqs: [string, string][];
};

const unconfirmed: CourseFacts = {format: null, duration: null, language: null, nextCohort: null, access: null};
const sharedFaqs: [string, string][] = [
  ['Is the listed fee final?', 'The fee shown comes from the existing NumericcVaastu website and is being reconfirmed. Ask the team for the current fee, taxes and payment terms before enrolling. No payment is taken on this website.'],
  ['When does the next batch start?', 'Batch dates, session timings and the teaching format are confirmed directly with the team. Send an enquiry and they will share the current schedule.'],
  ['Does the course guarantee clients or income?', 'No. The course teaches methods and consultation practice. Numerology is a traditional interpretive framework, and professional results depend on your own effort, context and decisions.'],
];

export const courseDetails: CourseDetail[] = [
  {
    offerId: 'course-launchpad',
    path: 'The Learning Path',
    level: 'Beginner',
    headline: 'Learn Lo Shu grid fundamentals, practise a structured consultation process and work towards Level 1 certification.',
    learn: [
      'Calculate core numbers from a name and date of birth',
      'Place a date of birth on the Lo Shu grid and read its pattern',
      'Apply the name numerology methods taught in the course',
      'Structure a client reading with the Consultation Blueprint System',
      'Practise readings in weekly live sessions with feedback',
      'Explain what a reading can and cannot tell a client',
    ],
    requirements: [
      'No prior numerology knowledge is needed.',
      'Time each week to attend the live practice sessions.',
      'A notebook for recording calculations and practice readings.',
    ],
    description: [
      'Numerology Career Launchpad is the first of NumericcVaastu’s three learning paths. It is built for people who are curious about numerology and want a structured way to learn it, rather than piecing it together from scattered sources.',
      'You start with the core calculations and the Lo Shu grid, then learn name numerology and a repeatable consultation structure. Weekly live sessions give you room to practise readings and ask questions while you learn.',
      'The course closes with the Level 1 certification pathway. If you later want to deepen your practice, Numerology Income Accelerator is the next path.',
    ],
    whoFor: [
      'Beginners who are curious about numerology and want to learn it properly',
      'Aspiring consultants looking for a structured starting point',
      'People who want to understand the method behind a reading, not just the result',
    ],
    modules: [
      {title: 'Core learning modules', summary: 'Twelve modules covering the foundations of numerology.', topics: ['Numerology foundations and core calculations', 'Lo Shu grid fundamentals']},
      {title: 'Name numerology training', summary: 'How names are analysed within the course method.', topics: ['Name numerology methods']},
      {title: 'Consultation Blueprint System', summary: 'A structure for running a client reading from start to finish.', topics: ['Preparing for and structuring a consultation']},
      {title: 'Weekly live practice sessions', summary: 'Guided practice on readings, held live each week.', topics: ['Practice readings and feedback']},
      {title: 'Level 1 certification pathway', summary: 'The route to the course’s Level 1 certification.', topics: ['Certification requirements to be confirmed with the team']},
    ],
    syllabusConfirmed: false,
    certificate: 'Level 1 certification pathway, issued by NumericcVaastu. Ask the team about the assessment and completion criteria.',
    facts: unconfirmed,
    ctaLabel: 'Enquire about this course',
    faqs: [
      ['Do I need any background in numerology?', 'No. Career Launchpad is the entry-level path and starts from the core calculations.'],
      ...sharedFaqs,
    ],
  },
  {
    offerId: 'course-accelerator',
    path: 'The Application Path',
    level: 'Intermediate',
    headline: 'Develop advanced numerology skills, refine your consultation framework and learn to present a professional practice.',
    learn: [
      'Apply advanced name and mobile number numerology',
      'Integrate Vedic numerology into your readings',
      'Run sessions with a fuller consultation framework',
      'Bring real practice questions to weekly live mentorship',
      'Describe your practice clearly on social media',
      'Discuss numerology topics in a corporate context',
    ],
    requirements: [
      'A working knowledge of numerology, such as the foundations covered in Career Launchpad.',
      'Some experience of practice readings is helpful.',
      'Time each week to join the live mentorship sessions.',
    ],
    description: [
      'Numerology Income Accelerator is the application path. It is for learners who already understand the basics and now want to deepen their technique and communicate a professional offer.',
      'The programme combines advanced methods, including name, mobile and Vedic numerology, with weekly live mentorship where you can work through real questions from your own practice.',
      'Alongside technique, it covers how to present your work: a consultation framework, a social media positioning toolkit and an introduction to corporate numerology topics.',
    ],
    whoFor: [
      'Learners who have completed Career Launchpad or have equivalent knowledge',
      'Practising consultants who want to strengthen their methods',
      'People preparing to offer numerology consultations professionally',
    ],
    modules: [
      {title: 'Weekly live mentorship', summary: 'Hot-seat sessions where your questions are worked through live.', topics: ['Mentorship on your own practice questions']},
      {title: 'Advanced name and mobile numerology', summary: 'Deeper methods for name and mobile number analysis.', topics: ['Advanced name numerology', 'Mobile number numerology']},
      {title: 'Vedic numerology integration', summary: 'Bringing Vedic numerology into your readings.', topics: ['Vedic numerology methods']},
      {title: 'Consultation framework', summary: 'A fuller structure for professional sessions.', topics: ['Running a professional consultation']},
      {title: 'Social media positioning toolkit', summary: 'Presenting your practice clearly online.', topics: ['Positioning and describing your practice']},
      {title: 'Corporate numerology topics', summary: 'Applying numerology discussions in a business setting.', topics: ['Corporate numerology topics']},
    ],
    syllabusConfirmed: false,
    certificate: 'Certification details for this path are being confirmed. Ask the team what is issued and how it is assessed.',
    facts: unconfirmed,
    ctaLabel: 'Enquire about this course',
    faqs: [
      ['Do I need to complete Career Launchpad first?', 'You need a working knowledge of numerology. Career Launchpad is the recommended route, and the team can advise if you learned elsewhere.'],
      ...sharedFaqs,
    ],
  },
  {
    offerId: 'course-mastery',
    path: 'The Teaching & Leadership Path',
    level: 'Advanced',
    headline: 'A year-long mentorship for experienced practitioners developing their teaching, leadership and professional brand.',
    learn: [
      'Work with advanced numerology resources from the course library',
      'Develop your teaching and mentoring practice',
      'Shape a personal brand strategy in one-to-one sessions',
      'Plan a sustainable professional presence through the brand incubator',
      'Progress along the Acharya certification pathway',
      'Learn alongside a community of experienced practitioners',
    ],
    requirements: [
      'Established experience as a numerology consultant.',
      'A commitment to a 12-month programme.',
      'An application conversation with the team before joining.',
    ],
    description: [
      'Numerology Legacy Mastery is the teaching and leadership path, and the most advanced of the three programmes. It is a 12-month mastermind for experienced consultants who want to mentor others and build a lasting professional presence.',
      'The programme brings together advanced numerology resources, a brand incubator, one-to-one personal brand strategy and the Acharya certification pathway, supported by an ongoing community.',
      'Because it is a long-term mentorship, joining starts with a conversation about your experience and goals, so both sides can confirm it is the right fit.',
    ],
    whoFor: [
      'Experienced numerology consultants',
      'Practitioners who want to teach or mentor others',
      'Consultants building a long-term professional brand',
    ],
    modules: [
      {title: '12-month mastermind', summary: 'A year of mentoring with Adarshh and fellow practitioners.', topics: ['Ongoing mastermind sessions']},
      {title: 'Advanced numerology resources', summary: 'Access to the programme’s advanced resource library.', topics: ['Advanced numerology material']},
      {title: 'Brand incubator', summary: 'Developing the structure of your professional practice.', topics: ['Brand incubator topics']},
      {title: 'Personal brand strategy', summary: 'One-to-one strategy for your personal brand.', topics: ['1:1 brand strategy sessions']},
      {title: 'Acharya certification pathway', summary: 'The route to the programme’s Acharya certification.', topics: ['Certification requirements to be confirmed with the team']},
      {title: 'Community access', summary: 'An ongoing circle of experienced practitioners.', topics: ['Community participation']},
    ],
    syllabusConfirmed: false,
    certificate: 'Acharya certification pathway, issued by NumericcVaastu. Ask the team about the assessment and completion criteria.',
    facts: {...unconfirmed, duration: '12-month programme'},
    ctaLabel: 'Apply for the programme',
    faqs: [
      ['Who is this programme for?', 'Experienced consultants who already practise numerology and want to teach, mentor and build a long-term professional presence.'],
      ['How do I join?', 'Send an enquiry. The team will arrange a conversation about your experience and goals before confirming a place.'],
      ...sharedFaqs,
    ],
  },
];

export function getCourseDetail(offerId: string): CourseDetail | undefined {
  return courseDetails.find((detail) => detail.offerId === offerId);
}
