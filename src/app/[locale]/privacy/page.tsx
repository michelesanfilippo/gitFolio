import { use, type ReactNode } from 'react';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { brand, withBasePath } from '@/config/brand';

// Informativa privacy (pagina statica). Descrive cosa fa davvero il codice: va aggiornata insieme alle funzioni che trattano dati.
const UPDATED = '26 October 2026';

export const metadata: Metadata = { title: `Privacy policy · ${brand.name}` };

function H({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 text-xl font-bold">{children}</h2>;
}

export default function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const issues = `${brand.repoUrl}/issues`;
  const contact = brand.contactEmail
    ? <>by email at <a href={`mailto:${brand.contactEmail}`}>{brand.contactEmail}</a> or on <a href={issues}>GitHub</a></>
    : <>on <a href={issues}>GitHub</a></>;

  return (
    <article className="mx-auto max-w-3xl px-6 py-12 text-[15px] leading-relaxed text-fg [&_a]:font-semibold [&_a]:text-accent-text [&_a:hover]:underline [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
      <h1 className="text-3xl font-bold">Privacy policy</h1>
      <p className="text-sm text-muted">Last updated: {UPDATED}</p>

      <p>
        {brand.name} is a free, open source CV builder. This page explains what data it handles, where it is stored and the
        choices you have. The source code is public on <a href={brand.repoUrl}>GitHub</a>, so you can check that it does what this
        page says.
      </p>

      <H>In short</H>
      <ul>
        <li>You can use {brand.name} <strong>without an account</strong>. In that case your CV never leaves your browser.</li>
        <li>An account is optional. It is only used to save up to 5 templates, keep a default photo and share a template&apos;s design.</li>
        <li>No advertising, no tracking or analytics cookies, and your data is never sold.</li>
      </ul>

      <H>Who is responsible</H>
      <p>
        {brand.name} is maintained by its author as a personal open source project
        (<a href="https://github.com/michelesanfilippo">github.com/michelesanfilippo</a>). You can reach us {contact}.
      </p>

      <H>Using {brand.name} without an account</H>
      <p>
        Everything you type, your photo and the PDF are processed in your browser. Your draft is saved in your browser&apos;s local
        storage on this device so you do not lose it when you reload the page. Nothing is sent to our servers. You can delete
        the draft at any time with <strong>Start over</strong> in the editor or by clearing your browser&apos;s site data.
      </p>

      <H>If you create an account</H>
      <p>Accounts are provided by <a href="https://supabase.com">Supabase</a>, which stores and processes the data on our behalf. We store:</p>
      <ul>
        <li><strong>Account data:</strong> your email address and how you log in (email and password, Google, GitHub or LinkedIn). Passwords are stored only as a secure hash.</li>
        <li><strong>Profile:</strong> a username and, if you choose one, a default photo for new CVs.</li>
        <li><strong>Saved templates</strong> (up to 5): the template name, the CV content and design, the photo you used and a small preview image.</li>
      </ul>
      <p>
        Database rules make sure only you can read or change your account data and templates. We use it only to provide these
        features. We do not use it for marketing and we do not share it with anyone else.
      </p>

      <H>Logging in with Google, GitHub or LinkedIn</H>
      <p>
        If you choose one of these providers, it sends us your <strong>name, email address and profile picture</strong> after you
        approve it. We do not ask for any other permission: we cannot post on your behalf or read your contacts, messages or the
        rest of your profile.
      </p>
      <p>
        <strong>Import from LinkedIn</strong> copies your LinkedIn name, email and profile picture into the CV you are editing.
        Nothing else is imported, and you can change or remove these fields afterwards.
      </p>

      <H>Sharing a design</H>
      <p>
        If you press <strong>Share</strong> on a saved template, we create a secret link. Anyone who opens it receives only the
        template name and its design (layout, colors, fonts, style). Your name, photo, contacts, CV content and preview image are
        never shared. <strong>Stop sharing</strong> disables the link immediately.
      </p>

      <H>Cookies and local storage</H>
      <p>
        We do not use advertising or analytics cookies. Your browser&apos;s local storage keeps your draft, and, if you log in, the
        login session. These are strictly necessary for the site to work.
      </p>
      <p>
        The site does not contact other services while you browse. The only exception: after you click the GitHub link in the
        header, when you come back to the page your browser asks GitHub&apos;s public API for the current number of stars, so
        GitHub sees your IP address, as it does when you open GitHub.
      </p>

      <H>How long we keep data</H>
      <p>
        Saved templates and your profile are kept until you delete them or your account. You can delete any template from the{' '}
        <a href={withBasePath(`/${locale}/dashboard/`)}>Dashboard</a>. To delete your whole account, contact us {contact}: deleting the
        account removes your profile and all your templates.
      </p>

      <H>Your rights</H>
      <p>
        You can ask to access, correct, export or delete your data, or object to how it is used. Contact us {contact}. If you are in
        the European Union, you can also lodge a complaint with your local data protection authority.
      </p>

      <H>Changes</H>
      <p>
        If {brand.name} starts handling data in a new way, we will update this page and the date at the top before the change goes live.
      </p>
    </article>
  );
}
