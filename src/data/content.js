export const posts=[
 {slug:'what-is-numerology',title:'What is numerology? A thoughtful introduction',category:'Numerology',description:'An approachable guide to numerology, how readings are framed, and where their limits lie.',date:'2026-10-01',sections:[['Starting with the question','Numerology is a traditional interpretive practice that assigns symbolic meaning to numbers associated with a person, often using a name or date of birth. People turn to it for reflection, conversation and a different way to frame questions.'],['What a reading can include','A practitioner may calculate several numbers, explain the meanings used within their particular system, and discuss patterns across those numbers. The interpretation depends on the method. Ask which method is being used and how each conclusion was reached.'],['What it cannot establish','A numerology reading cannot prove what will happen in your health, career, relationships or finances. It should not replace professional advice or pressure you into major decisions. The most useful reading is one that leaves room for your own judgment.'],['Where to begin','If you are curious, learn the vocabulary first. Keep a notebook of the calculations and ask what each observation means in practice. A structured introductory course can help you compare methods and interpret them responsibly.']]},
 {slug:'understanding-the-lo-shu-grid',title:'Understanding the Lo Shu grid',category:'Learning',description:'The familiar three-by-three grid and a careful way to begin reading it.',date:'2026-10-01',sections:[['A grid for organising numbers','The Lo Shu grid is a three-by-three arrangement of the digits one through nine. In some numerology approaches, digits from a date of birth are placed in the grid and read as a pattern.'],['A simple example','A birth date containing repeated digits would make those positions more prominent in the recorded pattern. Different schools explain repeated and absent digits differently, so write down the convention you are using before interpreting the result.'],['Interpret with context','A grid is a tool for conversation, not a measurement of personality or ability. Compare a reading against the person’s actual circumstances and avoid absolute predictions.'],['Learn the method','Understanding the underlying calculation is more valuable than memorising a quick description for each digit. Guided practice can help you learn the method and communicate its limits clearly.']]},
 {slug:'numerology-and-numeric-vaastu',title:'Numerology and Numeric Vaastu: how do they differ?',category:'Numeric Vaastu',description:'A practical comparison of personal numbers and spatial interpretation.',date:'2026-10-01',sections:[['The personal lens','Numerology commonly starts with a person’s name or date of birth. A consultation may examine the symbols associated with those numbers and invite reflection on a current question.'],['The spatial lens','Numeric Vaastu brings number-based interpretation into a discussion of space and direction. A practitioner may request a floor plan and orientation to discuss how a home or workplace is used.'],['Questions to ask','Before a session, ask what information is required, whether the work is remote or on site, what deliverable you will receive, and whether any recommendations require physical changes. Confirm the fee and follow-up terms.'],['Use your judgment','Both are traditional interpretive frameworks. They do not establish measurable cause and effect or replace architectural, engineering, medical, legal or financial expertise.']]},
 {slug:'prepare-for-a-consultation',title:'How to prepare for a numerology consultation',category:'Consultations',description:'Bring a clear question, understand the format, and know what to expect.',date:'2026-10-01',sections:[['Choose a useful question','Instead of asking for certainty about the future, think about the decision or pattern you want to understand. Write down the context that will help your practitioner have a meaningful conversation.'],['Confirm the practical details','Ask about duration, format, fee, follow-up, and the information the practitioner needs. Some sessions use your name and date of birth; a Vaastu consultation may require a floor plan. Share sensitive details only through a trusted channel.'],['During the session','Ask how observations were reached and which method is being used. Notes can help you revisit the discussion later. There is no obligation to accept every suggested action.'],['Afterward','Reflect on what was useful. If a decision has legal, medical or financial consequences, speak to the appropriate qualified professional before acting.']]},
];
/** Google reviews, copied word for word from the client's Google Business listing (October 2026).
 *  `partial: true` marks text that was cut off in the screenshot; replace with the full review when available. */
export const googleReviews=[
 {name:'Gyan Ranjan Panigrahy',rating:5,text:'I had a very nice consultation with Adarsh ji. He is such a nice personality with lot of patience in listening to problems and guided with Care.'},
 {name:'DrDarshika Gaur',rating:5,text:'I recently consulted Adarshh Panndey and had a truly insightful experience. He took the time to understand my concerns and provided detailed guidance based on my',partial:true},
 {name:'Yamini Menon',rating:5,text:'received very detailed information on basis on numerology. very happy with aadarsh ji’s service.'},
 {name:'Priya Khanna',rating:5,text:'The Guidance given by sir was amazing, many things I came to know which I was not aware of the detailed report about my mobile no my name spelling my car ever',partial:true},
];
export const testimonials=[
 {name:'Anita Ambhore',role:'Consultation feedback',summary:'Described feeling relieved after discussing a troubling question with Adarshh.'},
 {name:'Anjum Sayyed',role:'Consultation feedback',summary:'Shared that the discussion felt helpful and encouraging.'},
 {name:'Kanchan Kumar Sirpal',role:'Consultation feedback',summary:'Highlighted a clear explanation and an encouraging meeting.'},
 {name:'Bharti',role:'Consultation feedback',summary:'Appreciated the time taken to explain the reading without rushing.'},
 {name:'Sukanta Adhikari',role:'Consultation feedback',summary:'Wrote that the session helped address personal questions.'},
 {name:'Sharon Garcha',role:'Consultation feedback',summary:'Found the session informative and easy to understand.'},
];
export const galleryCategories=['Portraits','Awards','Talks & events','Media','Certificates'];
/** Photographs carry no captions until the owner supplies them; add `caption` to a record to show one. */
const g=(slug,w,h,category)=>({src:`/images/gallery/${slug}.webp`,w,h,category});
export const photos=[
 {src:'/images/adarshh/adarshh-pandey-portrait.webp',w:3464,h:3464,category:'Portraits'},
 g('award-book-of-the-year',1619,1080,'Awards'),
 g('talk-ntt-talk-show',1334,2000,'Talks & events'),
 g('media-studio-interview',2000,1333,'Media'),
 g('portrait-arms-crossed',1333,2000,'Portraits'),
 g('award-efi-conclave',2000,1333,'Awards'),
 g('talk-mahakumbh-podium',2000,1333,'Talks & events'),
 g('media-podcast-portrait',1333,2000,'Media'),
 g('award-national-awards-2025',2000,1333,'Awards'),
 {src:'/images/adarshh/adarshh-pandey-with-book.webp',w:3464,h:3464,category:'Portraits'},
 g('media-magazine-book-feature',1132,1600,'Media'),
 g('event-change-your-life',2000,1333,'Talks & events'),
 g('award-felicitation-stage',2000,1333,'Awards'),
 g('portrait-at-work',1333,2000,'Portraits'),
 g('media-interview-namaste',1333,2000,'Media'),
 g('talk-mahakumbh-stage',2000,1333,'Talks & events'),
 g('award-international-spotlight',2000,1334,'Awards'),
 g('media-podcast-studio',2000,1333,'Media'),
 {src:'/images/adarshh/adarshh-pandey-studio-portrait.webp',w:3464,h:3464,category:'Portraits'},
 g('event-book-presentation',1125,2000,'Talks & events'),
 g('award-sanatan-trophy',2000,1333,'Awards'),
 g('media-podcast-red-set',1333,2000,'Media'),
 g('talk-audience-session',2000,1333,'Talks & events'),
 g('portrait-standing',1333,2000,'Portraits'),
 g('award-plaque-presentation',1333,2000,'Awards'),
 g('media-interview-host',2000,1333,'Media'),
 g('event-mahakumbh-guests',2000,1333,'Talks & events'),
 g('award-mahakumbh-plaque',2000,1333,'Awards'),
 g('media-podcast-chair',1333,2000,'Media'),
 g('portrait-seated',1333,2000,'Portraits'),
 g('event-on-stage-greeting',1619,1080,'Talks & events'),
 g('media-studio-2025',2000,1333,'Media'),
 g('event-studio-harmonium',2000,1333,'Talks & events'),
 g('media-magazine-article',1132,1600,'Media'),
 ...[[1,720,1280],[2,900,1600],[3,720,1280],[4,900,1600],[5,900,1600],[6,900,1600]].map(([n,w,h])=>({src:`/images/adarshh/adarshh-pandey-certificate-event-${String(n).padStart(2,'0')}.webp`,w,h,category:'Certificates'})),
];
