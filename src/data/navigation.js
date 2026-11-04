import {consultations, courses} from './offers';
import {consultShortNames} from './consultScenarios';
import {posts} from './content';
import {book} from './media';
import {locations} from './locations';
import {store} from './shop';

// Only existing destinations belong here. Offer routes and names follow the commercial catalogue.
const session = (id, icon) => {
  const offer = consultations.find(item => item.id === id);
  return offer && {label: consultShortNames[id] || offer.name, href: `/consultations/${offer.slug}`, icon};
};
const sessions = items => items.map(([id, icon]) => session(id, icon)).filter(Boolean);
const courseLink = (id, description) => {
  const offer = courses.find(item => item.id === id);
  return offer && {label: offer.name, href: `/courses/${offer.slug}`, description, icon: 'book'};
};

// Menu order (client's choice): About, Consultations, Courses, Free tools, Shop, Watch & read, Help & contact.
export const navigationGroups = [
  {
    id: 'about', label: 'About', intro: 'The person, the practice and the people behind it.',
    columns: [
      {title: 'Meet NumericcVaastu', links: [
        {label: 'About Adarshh', href: '/about', icon: 'user', keywords: 'Adarsh Pandey Aadarsh Pandey Adarshh Pandey Adarsh Panndey founder numerologist'},
        {label: 'Achievements', href: '/achievements', icon: 'award'},
        {label: 'Client experiences', href: '/testimonials', icon: 'heart'},
      ]},
      {title: 'See the work', links: [
        {label: 'Photo gallery', href: '/gallery', icon: 'image'},
        {label: 'Students & classes', href: '/gallery', icon: 'graduation'},
        {label: 'Podcasts & interviews', href: '/podcasts', icon: 'mic'},
      ]},
      {title: 'Connect with us', links: [
        {label: 'Contact the team', href: '/contact', icon: 'phone'},
        {label: 'Invite Adarshh to speak', href: '/contact', icon: 'mic'},
        {label: 'Book a consultation', href: '/book-consultation', icon: 'calendar'},
      ]},
    ],
    footer: {label: 'Read his story', href: '/about'},
    feature: {eyebrow: 'Meet the founder', title: 'A life in numbers.', text: 'From a career in pharma to teaching and consulting.', label: 'Meet Adarshh', href: '/about', image: '/images/gallery/portrait-holding-book.webp'},
  },
  {
    id: 'consultations', label: 'Consultations', intro: 'Personal guidance, for the question on your mind.',
    columns: [
      {title: 'Life & decisions', links: sessions([['consult-blueprint', 'sparkles'], ['consult-career', 'briefcase'], ['consult-relationship', 'heart'], ['consult-business', 'building']])},
      {title: 'Names & everyday numbers', links: sessions([['consult-baby-name', 'baby'], ['consult-name', 'pen'], ['consult-mobile', 'phone'], ['consult-signature', 'signature'], ['consult-watch', 'watch']])},
      {title: 'Vaastu for your space', links: sessions([['consult-home-vastu', 'home'], ['consult-office-vastu', 'building']]), extra: {label: 'How a consultation works', href: '/blog/prepare-for-a-consultation', icon: 'compass'}},
    ],
    footer: {label: 'View all consultations', href: '/consultations'},
    feature: {eyebrow: 'One-to-one with Adarshh', title: 'Start with your question.', text: 'Find the session that feels right for you.', label: 'Help me choose', href: '/consultations', image: '/images/gallery/portrait-at-work.webp'},
  },
  {
    id: 'courses', label: 'Courses', intro: 'From your first calculation to your own practice.',
    columns: [
      {title: '01 · Foundation', links: [courseLink('course-launchpad', 'Start with the fundamentals. No experience needed.')].filter(Boolean)},
      {title: '02 · Application', links: [courseLink('course-accelerator', 'Deepen your methods and consultation skills.')].filter(Boolean)},
      {title: '03 · Teaching & leadership', links: [courseLink('course-mastery', 'Mentorship for experienced practitioners.')].filter(Boolean)},
    ],
    footer: {label: 'Compare all courses', href: '/courses'},
    feature: {eyebrow: 'The NumericcVaastu Academy', title: 'Learn with Adarshh.', text: 'Find the right path for where you are today.', label: 'Explore the academy', href: '/courses', image: '/images/students/teaching-what-is-numerology.webp'},
  },
  {
    id: 'tools', label: 'Free tools & reports', intro: 'A little self-discovery starts with your numbers.',
    columns: [
      {title: 'Free calculators', links: [
        {label: 'Lo Shu grid calculator', description: 'Your grid, Kua, planes and yogs.', href: '/numerology-calculator', icon: 'grid', badge: 'Free'},
        {label: 'Vedic kundli calculator', description: 'Your planetary grid and number reading.', href: '/vedic-numerology-calculator', icon: 'orbit', badge: 'Free'},
      ]},
      {title: 'Your complete reading', links: [
        {label: 'Combined full report', description: 'Lo Shu, Vedic, name and phone in one report.', href: '/numerology-calculator#report-options', icon: 'report', badge: 'Test edition'},
        {label: 'Review it with Adarshh', description: 'Bring your questions to a personal session.', href: '/consultations/personal-numerology-blueprint', icon: 'chat'},
      ]},
      {title: 'Understand the method', links: [
        {label: 'What is numerology?', href: '/blog/what-is-numerology', icon: 'book'},
        {label: 'Understand the Lo Shu grid', href: '/blog/understanding-the-lo-shu-grid', icon: 'grid'},
        {label: 'Numerology & Numeric Vaastu', href: '/blog/numerology-and-numeric-vaastu', icon: 'compass'},
      ]},
    ],
    footer: {label: 'Explore both free tools', href: '/#free-tools'},
    feature: {eyebrow: 'Two methods. One report.', title: 'Get to know your numbers.', text: 'The combined report is free while we test.', label: 'Start my reading', href: '/numerology-calculator', kind: 'report'},
  },
  // Opens Adarshh's crystal store (numericcvaastucrystal.in) directly, without a menu.
  {id: 'shop', label: 'Shop', href: store.url},
  {
    id: 'media', label: 'Watch & read', intro: 'Conversations, perspectives and practical guides.',
    columns: [
      {title: 'Watch & listen', links: [
        {label: 'Podcasts', href: '/podcasts', icon: 'mic'},
        {label: 'Predictions on record', href: '/predictions', icon: 'calendar'},
        {label: 'Videos & reels', href: '/#watch', icon: 'play'},
      ]},
      {title: 'Read & explore', links: [
        {label: 'All articles', href: '/blog', icon: 'book'},
        {label: 'Numerology for beginners', href: '/blog/what-is-numerology', icon: 'sparkles'},
        {label: 'Prepare for your consultation', href: '/blog/prepare-for-a-consultation', icon: 'list'},
      ]},
      {title: 'In pictures & print', links: [
        {label: 'Gallery', href: '/gallery', icon: 'image'},
        {label: 'Awards & achievements', href: '/achievements', icon: 'award'},
        {label: 'His book on Amazon', href: book.amazon, icon: 'book', external: true},
      ]},
    ],
    footer: {label: 'Browse the journal', href: '/blog'},
    feature: {eyebrow: 'Conversations worth hearing', title: 'A different perspective.', text: 'Watch Adarshh on India’s podcasts.', label: 'Watch the podcasts', href: '/podcasts', image: '/images/gallery/media-podcast-portrait.webp'},
  },
  {
    id: 'help', label: 'Help & contact', intro: 'Find an answer, or a person to talk to.',
    columns: [
      {title: 'We can help', links: [
        {label: 'Ask the site guide', action: 'guide', icon: 'chat'},
        {label: 'Frequently asked questions', href: '/faq', icon: 'help'},
        {label: 'Contact details', href: '/contact', icon: 'phone'},
        {label: 'Book or enquire', href: '/book-consultation', icon: 'calendar'},
      ]},
      {title: 'Before you book', links: [
        {label: 'Preparing for a consultation', href: '/blog/prepare-for-a-consultation', icon: 'list'},
        {label: 'Refunds & cancellations', href: '/refund-policy', icon: 'refresh'},
        {label: 'Terms of use', href: '/terms-and-conditions', icon: 'report'},
      ]},
      {title: 'Policies & information', links: [
        {label: 'Privacy notice', href: '/privacy-policy', icon: 'shield'},
        {label: 'Cookie information', href: '/cookie-policy', icon: 'shield'},
        {label: 'Practice disclaimer', href: '/disclaimer', icon: 'report'},
        {label: 'Site map', href: '/sitemap', icon: 'grid'},
      ]},
    ],
    footer: {label: 'See every page', href: '/sitemap'},
    feature: {eyebrow: 'A conversation starts here', title: 'We’re here to listen.', text: 'Ask about a session, a course or your next step.', label: 'Talk to the team', href: '/contact', kind: 'help'},
  },
];

const index = new Map();
for (const group of navigationGroups) {
  if (!group.columns) continue;
  for (const column of group.columns) {
    for (const link of [...column.links, ...(column.extra ? [column.extra] : [])]) {
      if (!link.href || link.external || index.has(link.href)) continue;
      index.set(link.href, {...link, group: group.id, category: group.label});
    }
  }
  if (!index.has(group.footer.href)) index.set(group.footer.href, {...group.footer, group: group.id, category: group.label});
}
for (const location of locations) index.set(`/${location.slug}`, {label: location.eyebrow, href: `/${location.slug}`, description: location.card, group: 'consultations', category: 'Consultations', icon: 'compass'});
for (const post of posts) index.set(`/blog/${post.slug}`, {label: post.title, href: `/blog/${post.slug}`, description: post.description, group: 'media', category: 'Watch & read', icon: 'book'});
export const navigationPages = [...index.values()];
