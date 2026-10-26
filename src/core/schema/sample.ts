import { p, ul } from '../richtext/ast';
import type { CvDocument, ExperienceItem } from './cv';

// Contenuto iniziale di un utente nuovo: solo segnaposto lorem ipsum, nessun riferimento a persone, aziende o prodotti reali.
// L'utente sostituisce ogni campo con i propri dati nella scheda Content.

export const LOREM_PROFILE_HTML =
  '<p>Lorem ipsum dolor sit amet, <strong>consectetur adipiscing</strong> elit, sed do <em>eiusmod</em> tempor incididunt ut labore et dolore magna aliqua.</p>';

const bullets = () =>
  ul(
    ['Ut enim ad minim veniam, quis nostrud ', { text: 'exercitation', bold: true }, ' ullamco laboris.'],
    ['Duis aute irure dolor in ', { text: 'reprehenderit', italic: true }, ' in voluptate velit esse.'],
  );

const exp = (i: number, role: string, company: string, start: string, end?: string): ExperienceItem => ({
  id: `exp-${i}`, role, company, location: 'Lorem City',
  dates: end ? { start, end } : { start, current: true },
  description: [p('Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.'), bullets()],
});

export const sampleCv = (locale: CvDocument['locale'] = 'en'): CvDocument => ({
  locale,
  personal: {
    fullName: 'Lorem Ipsum',
    headline: 'Dolor Sit Amet',
    contacts: [
      { id: 'c-email', kind: 'email', value: 'lorem.ipsum@example.com', visible: true },
      { id: 'c-phone', kind: 'phone', value: '+00 000 000 0000', visible: true },
      { id: 'c-loc', kind: 'location', value: 'Lorem City', visible: true },
      { id: 'c-web', kind: 'website', value: 'example.com/lorem', visible: true },
      { id: 'c-in', kind: 'linkedin', value: 'linkedin.com/in/your-name', visible: true },
      { id: 'c-gh', kind: 'github', value: 'github.com/your-name', visible: true },
    ],
  },
  profile: [
    p('Lorem ipsum dolor sit amet, ', { text: 'consectetur adipiscing', bold: true }, ' elit, sed do ', { text: 'eiusmod', italic: true }, ' tempor incididunt ut labore et dolore magna aliqua.'),
  ],
  experience: [
    exp(1, 'Lorem Ipsum Role', 'Dolor Sit Company', '2022-01'),
    exp(2, 'Consectetur Role', 'Adipiscing Studio', '2018-03', '2021-12'),
  ],
  education: [
    { id: 'ed1', degree: 'Lorem Ipsum Degree', school: 'Dolor Sit University', location: 'Lorem City', dates: { start: '2014-09', end: '2017-07' } },
  ],
  skills: [
    { id: 's1', name: 'Lorem', skills: [{ id: 's1a', name: 'Ipsum', level: 5 }, { id: 's1b', name: 'Dolor', level: 4 }, { id: 's1c', name: 'Sit', level: 4 }, { id: 's1d', name: 'Amet', level: 3 }] },
    { id: 's2', name: 'Consectetur', skills: [{ id: 's2a', name: 'Adipiscing', level: 4 }, { id: 's2b', name: 'Elit', level: 3 }, { id: 's2c', name: 'Tempor', level: 3 }] },
  ],
  languages: [
    { id: 'lg1', name: 'Lorem', level: 'C2', value: 5 },
    { id: 'lg2', name: 'Ipsum', level: 'B2', value: 3 },
  ],
  certifications: [{ id: 'c1', name: 'Lorem Ipsum Certificate', issuer: 'Dolor Sit Institute', date: '2022-05' }],
  projects: [
    { id: 'p1', name: 'Lorem Ipsum Project', role: 'Dolor', tech: ['Sit', 'Amet'], description: [p('Sed ut perspiciatis unde omnis iste natus error sit voluptatem.')] },
  ],
  custom: [],
  sectionTitles: {},
  hiddenSections: [],
});
