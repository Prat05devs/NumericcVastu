/**
 * Course detail-page content, keyed by offer id in offers.ts.
 * Prices, names and listed inclusions stay in offers.ts; this file only holds the long-form page copy.
 * Career Launchpad's and Income Accelerator's modules are Adarshh's own syllabi (November 2026); Legacy Mastery still
 * uses an outline drawn from the existing website's listing. Replace each with the approved lesson-by-lesson syllabus when Adarshh supplies
 * it and set `syllabusConfirmed: true`. Fill `facts` only with confirmed values: a fact left null is not published.
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
  ['How do I pay?', 'Enrol online and pay securely through Razorpay with UPI, a card or net banking. If you’d like to talk about payment options first, ask the team on WhatsApp.'],
  ['When does the next batch start?', 'Batch dates, session timings and the teaching format are confirmed directly with the team. Send an enquiry and they will share the current schedule.'],
  ['Does the course guarantee clients or income?', 'No. The course teaches methods and consultation practice. Students share their own results in the videos on this page; those are individual experiences, not a promise. Professional results depend on your own effort, context and decisions.'],
];

export const courseDetails: CourseDetail[] = [
  {
    offerId: 'course-launchpad',
    path: 'The Learning Path',
    level: 'Beginner',
    headline: 'Learn driver, conductor and Kua numbers, prepare and read a numeroscope, correct names and apply remedies, then build the skills to work with clients.',
    learn: [
      'Prepare a numeroscope from a date of birth and read its 8 yogas',
      'Read driver and conductor numbers and all 81 of their combinations',
      'Explain repeated and missing numbers and the remedies taught for them',
      'Read personal year, month and day trends and their luck factor',
      'Correct a name spelling and use it without changing official documents',
      'Run a 5-step client analysis, set your fees and handle objections',
    ],
    requirements: [
      'No prior numerology knowledge is needed.',
      'Time each week to attend the live practice sessions.',
      'A notebook for recording calculations and practice readings.',
    ],
    description: [
      'Numerology Career Launchpad is the first of NumericcVaastu’s three learning paths. It is built for people who are curious about numerology and want a structured way to learn it, rather than piecing it together from scattered sources.',
      'Its syllabus, the Numerology Professional Success Program, runs in four parts: the core numbers and the numeroscope; repeated and missing numbers, remedies and personal trends; name correction, compatibility and specialist readings; and finally the practice of working with clients.',
      'The course closes with a high tea and dance celebration and the certificate ceremony. If you later want to deepen your practice, Numerology Income Accelerator is the next path.',
    ],
    whoFor: [
      'Beginners who are curious about numerology and want to learn it properly',
      'Aspiring consultants looking for a structured starting point',
      'People who want to understand the method behind a reading, not just the result',
    ],
    // Adarshh's syllabus, "Numerology Professional Success Program", supplied by the client on 2 November 2026.
    modules: [
      {title: 'Foundations and the numeroscope', summary: 'The core numbers, and how to prepare and read a numeroscope.', topics: [
        'What is numerology', 'The role of numbers in our life', 'Driver number', 'Conductor number', 'Kua number',
        'The 8 types of yogas in the numeroscope', 'How to prepare a numeroscope', 'Compatibility of numbers (key topic)',
        'Driver–conductor relationships: all 81 combinations (key topic)', 'Characteristics of numbers 1 to 9',
      ]},
      {title: 'Patterns, remedies and timing', summary: 'Repeated and missing numbers, the first remedies, and trends for any year, month or day.', topics: [
        'Impact of repeated numbers in the date of birth', 'Impact of missing numbers', 'How to fill missing numbers (remedies, part 1)',
        'Role of the conductor number', 'Master conductor number', 'Future trends', 'Personal year trend', 'Personal month trend',
        'Personal day trend', 'Luck factor for the year, month and day', 'Role of colours in numerology',
      ]},
      {title: 'Names, remedies and advanced readings', summary: 'Name correction, profession and remedies, compatibility between people, and specialist readings.', topics: [
        'Role of name spelling in life (the master stroke)', 'How to correct a name spelling', 'Using a corrected spelling without changing official documents',
        'Identifying a suitable profession from the date of birth', 'How to uplift the date of birth (remedies, part 2)', 'Vedic remedies (part 3)',
        'Compatibility of the numeroscopes of two or more people', 'Big arrows and small arrows', 'Prediction without a date of birth (Prashan Lagan)',
        'Signature analysis', 'Business cards according to Numero-Vastu', 'Love marriage and arranged marriage', 'The relationship sector', 'Karmic numbers',
      ]},
      {title: 'Professional practice and certification', summary: 'Case studies, working with clients, fees and marketing, then the celebration and certificate ceremony.', topics: [
        'Doubt-clearing session', 'Case studies', 'How to present yourself to a client', 'The 5-step analysis', 'Setting your fee structure',
        'Handling client objections', 'A millionaire mindset for success', 'A marketing plan to establish yourself as a professional numerologist',
        'High tea and dance celebration', 'Certificate ceremony',
      ]},
    ],
    syllabusConfirmed: true,
    certificate: 'Level 1 certificate from NumericcVaastu, presented at the certificate ceremony that closes the course. Ask the team about the completion criteria.',
    facts: unconfirmed,
    ctaLabel: 'Enquire about this course',
    faqs: [
      ['Do I need any background in numerology?', 'No. Career Launchpad is the entry-level path and starts from the core calculations.'],
      ['What does the course cover?', 'Four parts: the core numbers and the numeroscope; repeated and missing numbers, remedies and personal trends; name correction, compatibility and specialist readings such as signature analysis and karmic numbers; and working with clients. Every lesson is listed on this page.'],
      ['Is there a certificate?', 'Yes. The course ends with a certificate ceremony, after a high tea and dance celebration.'],
      ...sharedFaqs,
    ],
  },
  {
    offerId: 'course-accelerator',
    path: 'The Application Path',
    level: 'Intermediate',
    headline: 'A one-year mentorship with Adarshh: complete numerology from the foundations, then consultation, sales, personal branding and the systems to grow a professional practice.',
    learn: [
      'Analyse a date of birth completely, from the Lo Shu grid to 81 number combinations and 5-year planning',
      'Choose and correct names for people, babies, businesses, brands and products',
      'Analyse and select mobile, business and WhatsApp numbers',
      'Apply numerology to businesses: registration dates, offices, brand colours and visiting cards',
      'Run a structured 60–90 minute consultation and prepare a client report',
      'Build your personal brand and the sales, marketing and team systems of a practice',
    ],
    requirements: [
      'A commitment to a one-year program.',
      'Time for weekly live sessions, assignments and real client practice.',
      'An application conversation with the team before joining.',
    ],
    description: [
      'Numerology Income Accelerator is a one-year program of mentorship with Adarshh Panndey, from the foundations of numerology to running and growing a professional practice.',
      'It runs in ten phases. The first six cover the method in depth: the systems and core numbers, complete date-of-birth analysis, name, mobile and business numerology, and remedies. The last four turn it into a practice: consultation mastery, sales and communication, personal branding and business growth.',
      'Bonus modules add AI tools, report templates, consultation scripts and client agreements. Throughout the program you get weekly live Q&A, case study discussions, real client practice, assignments and feedback, ending in certification on successful completion.',
    ],
    whoFor: [
      'People who want to build a full-time numerology practice',
      'Consultants ready to grow a premium practice and personal brand',
      'Learners who want long-term mentorship with Adarshh, not a short course',
    ],
    // Adarshh's one-year syllabus for this course, supplied by the client on 2 November 2026 (originally in Hindi and English).
    modules: [
      {title: 'Foundation of numerology', summary: 'The systems, the core numbers and how they work.', topics: [
        'The history and science of numerology', 'Pythagorean, Chaldean and Vedic numerology', 'How the energy of numbers works',
        'Universal year, month and day numbers', 'Mulank, Bhagyank and destiny number', 'Karmic numbers', 'Master numbers (11, 22, 33)',
      ]},
      {title: 'Deep numerology analysis', summary: 'A complete reading of a date of birth, its timing and every area of life.', topics: [
        'Complete date-of-birth analysis', 'Advanced Lo Shu grid', 'Missing numbers analysis', 'Repeated numbers analysis', '81 number combinations',
        'Personal year, month and day prediction', '5-year future planning', 'Career analysis', 'Relationship compatibility',
        'Health tendencies (a guidance tool, not a medical diagnosis)', 'Wealth and business analysis',
      ]},
      {title: 'Name numerology', summary: 'Choosing and correcting names for people, businesses, brands and products.', topics: [
        'Name correction', 'Lucky name selection', 'Business name numerology', 'Brand name selection', 'Company name selection',
        'Product name numerology', 'Baby name numerology',
      ]},
      {title: 'Mobile numerology', summary: 'Reading, choosing and remedying personal and business numbers.', topics: [
        'Mobile number analysis', 'Lucky mobile number selection', 'Business mobile number', 'WhatsApp number energy', 'Mobile remedies',
      ]},
      {title: 'Business numerology', summary: 'Numerology for companies: dates, registrations, offices and brand identity.', topics: [
        'Business growth strategy', 'Company registration date', 'GST and business number analysis', 'Office numerology', 'Brand colours',
        'Visiting card analysis', 'Logo numerology basics',
      ]},
      {title: 'Remedies', summary: 'Practical remedies and daily practices to recommend to clients.', topics: [
        'Number remedies', 'Colour therapy', 'Signature analysis', 'Affirmations', 'Daily number practices', 'Lucky date selection',
      ]},
      {title: 'Consultation mastery', summary: 'Running complete, ethical consultations and preparing client reports.', topics: [
        'Client analysis framework', 'A 60–90 minute consultation structure', 'Report preparation', 'Handling difficult questions',
        'Ethical consulting', 'A high-value client experience',
      ]},
      {title: 'Sales and communication', summary: 'Explaining your services, handling objections and following up with clients.', topics: [
        'High-ticket consultation sales', 'Discovery call script', 'Objection handling', 'Closing techniques', 'WhatsApp follow-up', 'Referral system',
      ]},
      {title: 'Personal branding', summary: 'Building a public presence, from social media to podcasts and a book.', topics: [
        'Instagram growth', 'YouTube strategy', 'LinkedIn authority', 'Public speaking', 'Podcast strategy', 'PR and media', 'Book writing basics',
      ]},
      {title: 'Business growth', summary: 'The systems, team and marketing to grow a numerology practice.', topics: [
        'A growth roadmap for scaling your practice', 'Team building', 'SOP creation', 'Lead generation',
        'Facebook and Instagram ads basics', 'Webinar funnel', 'Automation', 'Client retention',
      ]},
      {title: 'Bonus modules', summary: 'Tools, templates and scripts for your own practice.', topics: [
        'AI tools for numerologists', 'Canva for social media', 'ChatGPT for content creation', 'Premium report templates',
        'Ready-to-use consultation scripts', 'Client agreement templates', 'Business checklists',
      ]},
      {title: 'Live mentorship', summary: 'Support from Adarshh throughout the year.', topics: [
        'Weekly live Q&A', 'Case study discussions', 'Real client practice sessions', 'Doubt support', 'Community access',
        'Assignments and feedback', 'Certification on successful completion',
      ]},
    ],
    syllabusConfirmed: true,
    certificate: 'Certification from NumericcVaastu on successful completion of the program. Ask the team about the assignments and completion criteria.',
    facts: {...unconfirmed, duration: '1 year'},
    ctaLabel: 'Enquire about this course',
    faqs: [
      ['Who is this program for?', 'People who want to build a full-time numerology practice with long-term mentorship: the method in depth, then consultations, sales, branding and business growth.'],
      ['How long is the program?', 'One year, in ten phases plus bonus modules, with weekly live Q&A, case study discussions and real client practice throughout.'],
      ['What does the program cover?', 'Foundations, deep date-of-birth analysis, name, mobile and business numerology, remedies, consultation mastery, sales and communication, personal branding and business growth. Every topic is listed on this page.'],
      ['How do I join?', 'Send an enquiry. The team will arrange a conversation about your experience and goals before confirming a place.'],
      ...sharedFaqs,
    ],
  },
  {
    offerId: 'course-mastery',
    path: 'The Teaching & Leadership Path',
    level: 'Advanced',
    headline: 'Everything in the Income Accelerator, plus a podcast, business setup, CRM and LMS, three months of social media and a website for your practice.',
    learn: [
      'Everything taught in the Numerology Income Accelerator',
      'Launch your own podcast',
      'Set up your numerology business',
      'Run your practice on a CRM and an LMS for your students',
      'Grow with three months of social media services',
      'Get your professional website set up',
    ],
    requirements: [
      'Established experience as a numerology consultant.',
      'A commitment to a 12-month programme.',
      'An application conversation with the team before joining.',
    ],
    description: [
      'Numerology Legacy Mastery is the most complete of the three programmes. It includes everything in the Numerology Income Accelerator, and then builds the practice around you.',
      'On top of the Accelerator’s training and mentorship, you get a podcast, business setup, a CRM to manage clients and an LMS to teach your own students, three months of social media services and a website set up for your practice.',
      'Because it is a long-term mentorship, joining starts with a conversation about your experience and goals, so both sides can confirm it is the right fit.',
    ],
    whoFor: [
      'Experienced numerology consultants',
      'Practitioners who want to teach or mentor others',
      'Consultants building a long-term professional brand',
    ],
    modules: [
      {title: 'Everything in the Income Accelerator', summary: 'The complete Accelerator programme: numerology in depth, consultation mastery, sales, branding and business growth.', topics: ['All ten Accelerator phases', 'Weekly live Q&A and mentorship', 'Real client practice sessions']},
      {title: 'Podcast', summary: 'Your own podcast to share your knowledge and build trust.', topics: ['Podcast setup and launch']},
      {title: 'Business setup', summary: 'Setting up your numerology practice as a business.', topics: ['Business setup support']},
      {title: 'CRM and LMS', summary: 'A CRM to manage clients and an LMS to teach your own students.', topics: ['Client management (CRM)', 'Course platform (LMS)']},
      {title: 'Social media services', summary: 'Three months of social media services for your practice.', topics: ['3 months of social media services']},
      {title: 'Website setup', summary: 'A professional website for your practice.', topics: ['Website setup']},
    ],
    syllabusConfirmed: false,
    certificate: 'Certification pathway, issued by NumericcVaastu. Ask the team about the assessment and completion criteria.',
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
