import { p, ul } from '../richtext/ast';
import type { CvDocument, ExperienceItem } from './cv';

const bullets = (n: number) =>
  ul(
    ['Progettato e rilasciato una piattaforma con ', { text: 'oltre 2 milioni', bold: true }, ' di utenti attivi.'],
    ['Ridotto i tempi di build del ', { text: '45%', bold: true }, ' introducendo cache distribuite e test paralleli.'],
    ['Guidato un team di ', { text: `${n} sviluppatori`, italic: true }, ' tra Milano, Zürich e Málaga.'],
    ['Documentazione: ', { text: 'scopri il progetto', link: 'https://github.com/michelesanfilippo/gitFolio' }, '.'],
  );

const exp = (i: number, role: string, company: string, start: string, end?: string): ExperienceItem => ({
  id: `exp-${i}`, role, company, location: i % 2 ? 'Milano, Italia' : 'Zürich, Schweiz',
  dates: end ? { start, end } : { start, current: true },
  description: [p('Responsabile dell’evoluzione di servizi ', { text: 'cloud-native', italic: true }, ' e della qualità del software, con focus su prestazioni, accessibilità e sicurezza.'), bullets(3 + i)],
});

export const sampleCv = (locale: CvDocument['locale'] = 'en'): CvDocument => ({
  locale,
  personal: {
    fullName: 'Chiara Ferrari-Müller',
    headline: 'Senior Software Engineer',
    email: 'chiara.ferrari@example.com',
    phone: '+39 02 1234 5678',
    location: 'Milano, Italia',
    links: [
      { id: 'l1', label: 'github.com/chiara', url: 'https://github.com/chiara' },
      { id: 'l2', label: 'linkedin.com/in/chiara', url: 'https://linkedin.com/in/chiara' },
    ],
  },
  profile: [
    p('Ingegnera del software con 10+ anni di esperienza nello sviluppo di prodotti web scalabili. Appassionata di ', { text: 'open source', bold: true }, ', tipografia e design dei sistemi. Caratteri speciali: àèéìòù çñ üöäß € & % # © ™.'),
    p('Disponibile a collaborazioni internazionali — ', { text: 'portfolio', link: 'https://example.com/portfolio' }, '.'),
  ],
  experience: [
    exp(1, 'Senior Software Engineer', 'Acme Technologies', '2021-03'),
    exp(2, 'Software Engineer', 'Globex Corporation', '2018-01', '2021-02'),
    exp(3, 'Full-Stack Developer', 'Initech', '2015-06', '2017-12'),
    exp(4, 'Junior Developer', 'Umbrella Labs', '2013-09', '2015-05'),
  ],
  education: [
    { id: 'ed1', degree: 'MSc Computer Science', school: 'Politecnico di Milano', location: 'Milano', dates: { start: '2011-09', end: '2013-07' }, description: [p('Tesi: sistemi distribuiti ad alta disponibilità. Voto 110/110 con lode.')] },
    { id: 'ed2', degree: 'BSc Computer Engineering', school: 'Università di Bologna', location: 'Bologna', dates: { start: '2008-09', end: '2011-07' } },
  ],
  skills: [
    { id: 's1', name: 'Languages', skills: [{ name: 'TypeScript', level: 5 }, { name: 'Java', level: 4 }, { name: 'Python', level: 3 }, { name: 'SQL', level: 4 }] },
    { id: 's2', name: 'Frameworks', skills: [{ name: 'React', level: 5 }, { name: 'Next.js', level: 5 }, { name: 'Spring Boot', level: 4 }, { name: 'Node.js', level: 4 }] },
    { id: 's3', name: 'Tools', skills: [{ name: 'Docker' }, { name: 'Kubernetes' }, { name: 'Git' }, { name: 'CI/CD' }] },
  ],
  languages: [
    { id: 'lg1', name: 'Italiano', level: 'C2', value: 5 },
    { id: 'lg2', name: 'English', level: 'C1', value: 4 },
    { id: 'lg3', name: 'Deutsch', level: 'B2', value: 3 },
  ],
  certifications: [
    { id: 'c1', name: 'AWS Certified Solutions Architect', issuer: 'Amazon Web Services', date: '2022-05', url: 'https://example.com/verify/aws' },
    { id: 'c2', name: 'Certified Kubernetes Administrator', issuer: 'CNCF', date: '2021-11' },
  ],
  projects: [
    { id: 'p1', name: 'gitFolio', role: 'Maintainer', tech: ['TypeScript', 'Next.js', 'react-pdf'], url: 'https://github.com/michelesanfilippo/gitFolio', description: [p('Generatore di CV open source, gratuito e senza watermark.')] },
    { id: 'p2', name: 'Open Metrics Dashboard', role: 'Autrice', tech: ['React', 'D3'], description: [p('Dashboard open source per la visualizzazione di metriche applicative.')] },
  ],
});
