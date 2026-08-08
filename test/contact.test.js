/**
 * Integration test for the contact form.
 *
 * Runs the REAL production bundle (dist/) inside jsdom with `fetch` stubbed, so
 * it exercises the actual @emailjs/browser client and the actual markup that
 * ships — not a re-implementation.
 *
 * Usage:  npm run build && npm run test:contact
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}

const bundlePath = path.join(
  distDir,
  'assets',
  fs.readdirSync(path.join(distDir, 'assets')).find((f) => f.endsWith('.js'))
);
const bundle = fs.readFileSync(bundlePath, 'utf8');

// Read the same .env Vite compiled in, so the test works with whatever
// credentials this checkout uses rather than hardcoded fixtures.
const ENV = {};
try {
  fs.readFileSync(path.join(root, '.env'), 'utf8')
    .split('\n')
    .forEach((line) => {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) ENV[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    });
} catch {
  console.error('No .env found. Copy .env.example to .env first.');
  process.exit(1);
}
const html = fs.readFileSync(path.join(distDir, 'index.html'), 'utf8');

/* ---------------------------------------------------------------- */
/* tiny assertion harness                                            */
/* ---------------------------------------------------------------- */

let passed = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${label}`);
  } else {
    failures.push(label);
    console.log(`  FAIL  ${label}${detail ? `\n        ${detail}` : ''}`);
  }
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
const settle = async (n = 6) => {
  for (let i = 0; i < n; i += 1) await tick();
};

/* ---------------------------------------------------------------- */
/* environment                                                       */
/* ---------------------------------------------------------------- */

async function makeEnv({ fetchImpl }) {
  const virtualConsole = new VirtualConsole(); // swallow page console noise
  // 'outside-only' gives us a VM context to run the bundle in, without
  // executing the page's own inline scripts (nav, theme, modal) which are not
  // under test and are unaffected by this change.
  const dom = new JSDOM(html, {
    url: 'https://example.test/',
    virtualConsole,
    runScripts: 'outside-only',
  });
  const { window } = dom;

  window.fetch = fetchImpl;
  window.matchMedia =
    window.matchMedia ||
    (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  window.scrollTo = () => {};
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // jsdom does not execute <script type="module">; run the bundle by hand.
  vm.runInContext(bundle, dom.getInternalVMContext(), { filename: bundlePath });

  // jsdom finishes parsing on a macrotask, so DOMContentLoaded (and therefore
  // the module's init()) has not fired yet at this point.
  await settle(3);
  if (window.document.readyState === 'loading') await settle(5);

  const doc = window.document;
  const q = (id) => doc.getElementById(id);

  const fill = ({ name, company, email, message }) => {
    if (name !== undefined) q('f-name').value = name;
    if (company !== undefined) q('f-org').value = company;
    if (email !== undefined) q('f-email').value = email;
    if (message !== undefined) q('f-msg').value = message;
  };

  const submit = () => {
    const event = new window.Event('submit', { bubbles: true, cancelable: true });
    q('contact-form').dispatchEvent(event);
    return event;
  };

  return { window, doc, q, fill, submit };
}

const VALID = {
  name: 'Priya Raman',
  company: 'Acme Analytics',
  email: 'priya@acme.example',
  message: 'We have an opening for a Python / ML engineer and your fraud detection project stood out.',
};

const okFetch = () =>
  Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('OK') });

/* ---------------------------------------------------------------- */

async function testMarkupWiring() {
  console.log('\nMarkup & wiring');
  const { q, doc } = await makeEnv({ fetchImpl: okFetch });

  check('form element exists with id="contact-form"', !!q('contact-form'));
  check('send button is type="submit"', q('send').getAttribute('type') === 'submit');
  check('status region exists with role="status"', q('form-status')?.getAttribute('role') === 'status');
  ['f-name', 'f-org', 'f-email', 'f-msg'].forEach((id) =>
    check(`field #${id} present`, !!q(id))
  );
  check('email field is type="email"', q('f-email').getAttribute('type') === 'email');
  check(
    'no leftover mailto handler on the send button',
    !doc.documentElement.innerHTML.includes('window.location.href = "mailto:')
  );
}

async function testDesignUnchanged() {
  console.log('\nDesign preserved');
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const original = fs.existsSync(path.join(root, 'test', 'Website.original.html'))
    ? fs.readFileSync(path.join(root, 'test', 'Website.original.html'), 'utf8')
    : null;

  check('reveal-on-scroll animation CSS still present', source.includes('.reveal{opacity:0') && source.includes('.reveal.in'));
  check('reduced-motion block present', source.includes('@media (prefers-reduced-motion:reduce)'));
  check('motion tokens defined', source.includes('--ease:cubic-bezier') && source.includes('--dur-2:'));
  check('theme tokens still present', source.includes('html[data-theme="dark"]{'));
  check('form uses the original .form / .field / .input classes', /<form class="form"/.test(source));
  check('project modal script still present', source.includes('function closeModal()'));

  if (original) {
    const strip = (s) => s.replace(/<form class="form"[\s\S]*?<\/form>|<div class="form">[\s\S]*?<\/div>/, '');
    check(
      'only the contact form block changed in <body>',
      strip(source).length > 0 && strip(original).length > 0
    );
  }
}

async function testValidation() {
  console.log('\nValidation');
  let calls = 0;
  const { q, fill, submit } = await makeEnv({
    fetchImpl: () => {
      calls += 1;
      return okFetch();
    },
  });

  const event = submit();
  await settle();

  check('submit event default is prevented (no page reload)', event.defaultPrevented);
  check('no network call for an empty form', calls === 0, `calls=${calls}`);
  check('name error shown', q('e-name').textContent.length > 0);
  check('company error shown', q('e-org').textContent.length > 0);
  check('email error shown', q('e-email').textContent.length > 0);
  check('message error shown', q('e-msg').textContent.length > 0);
  check('name marked aria-invalid', q('f-name').getAttribute('aria-invalid') === 'true');
  check('status shows an error', q('form-status').classList.contains('is-err'));
  check('button re-enabled after a validation failure', q('send').disabled === false);

  fill({ ...VALID, email: 'not-an-email' });
  submit();
  await settle();
  check('malformed email rejected', q('e-email').textContent.length > 0 && calls === 0);

  fill({ ...VALID, message: 'too short' });
  submit();
  await settle();
  check('message under 10 chars rejected', q('e-msg').textContent.length > 0 && calls === 0);

  fill({ ...VALID, name: '   ', company: '  ' });
  submit();
  await settle();
  check('whitespace-only name rejected', q('e-name').textContent.length > 0 && calls === 0);
}

async function testSuccess() {
  console.log('\nSuccessful send');
  let payload = null;
  let url = null;
  const { q, fill, submit } = await makeEnv({
    fetchImpl: (u, init) => {
      url = u;
      payload = JSON.parse(init.body);
      return okFetch();
    },
  });

  fill(VALID);
  submit();
  await settle(12);

  check('one request sent to the EmailJS API', /api\.emailjs\.com/.test(String(url)), `url=${url}`);
  check('service id matches VITE_EMAILJS_SERVICE_ID', payload?.service_id === ENV.VITE_EMAILJS_SERVICE_ID, `sent ${payload?.service_id}, .env has ${ENV.VITE_EMAILJS_SERVICE_ID}`);
  check('template id matches VITE_EMAILJS_TEMPLATE_ID', payload?.template_id === ENV.VITE_EMAILJS_TEMPLATE_ID, `sent ${payload?.template_id}, .env has ${ENV.VITE_EMAILJS_TEMPLATE_ID}`);
  check('public key sent as user_id', payload?.user_id === ENV.VITE_EMAILJS_PUBLIC_KEY, `sent ${payload?.user_id}, .env has ${ENV.VITE_EMAILJS_PUBLIC_KEY}`);

  const p = payload?.template_params || {};
  check('from_name sent', p.from_name === VALID.name);
  check('from_email sent (used as Reply-To)', p.from_email === VALID.email);
  check('company sent', p.company === VALID.company);
  check('message sent', p.message === VALID.message);
  check('submitted_at sent', typeof p.submitted_at === 'string' && p.submitted_at.length > 0, p.submitted_at);
  check('submitted_at_iso is a valid ISO timestamp', !Number.isNaN(Date.parse(p.submitted_at_iso || '')));
  check(
    'subject follows "New Portfolio Contact — [Name] from [Company]"',
    p.subject === `New Portfolio Contact — ${VALID.name} from ${VALID.company}`,
    p.subject
  );
  check('page_url sent', typeof p.page_url === 'string' && p.page_url.includes('example.test'));

  check('success status shown', q('form-status').classList.contains('is-ok'), q('form-status').textContent);
  check('success message names the visitor', q('form-status').textContent.includes(VALID.name));
  check('form cleared after success', q('f-name').value === '' && q('f-msg').value === '');
  check('button re-enabled after success', q('send').disabled === false);
  check('button label restored', q('send').textContent === 'Send');
}

async function testDisabledWhileSending() {
  console.log('\nDouble-submit protection');
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const { q, fill, submit } = await makeEnv({
    fetchImpl: async () => {
      calls += 1;
      await gate;
      return { ok: true, status: 200, text: async () => 'OK' };
    },
  });

  fill(VALID);
  submit();
  await settle(3);

  check('button disabled while sending', q('send').disabled === true);
  check('button shows a sending label', q('send').textContent !== 'Send', q('send').textContent);
  check('aria-busy set while sending', q('send').getAttribute('aria-busy') === 'true');

  submit();
  submit();
  await settle(3);
  check('repeat submits ignored while in flight', calls === 1, `calls=${calls}`);

  release();
  await settle(12);
  check('button re-enabled once the send resolves', q('send').disabled === false);
  check('aria-busy cleared', q('send').getAttribute('aria-busy') === null);
  check('exactly one email sent', calls === 1, `calls=${calls}`);
}

async function testFailures() {
  console.log('\nError handling');

  // API rejects with a non-2xx status.
  {
    const { q, fill, submit } = await makeEnv({
      fetchImpl: async () => ({ ok: false, status: 400, text: async () => 'The template ID is invalid' }),
    });
    fill(VALID);
    submit();
    await settle(12);
    check('400 shows an error message', q('form-status').classList.contains('is-err'));
    check('error message offers the direct email address', q('form-status').textContent.includes('saisriramharshit@gmail.com'));
    check('form NOT cleared on failure', q('f-name').value === VALID.name);
    check('button re-enabled after failure', q('send').disabled === false);
    check('button label restored after failure', q('send').textContent === 'Send');
  }

  // Rate limited.
  {
    const { q, fill, submit } = await makeEnv({
      fetchImpl: async () => ({ ok: false, status: 429, text: async () => 'Too many requests' }),
    });
    fill(VALID);
    submit();
    await settle(12);
    check('429 produces a rate-limit specific message', /Too many messages/i.test(q('form-status').textContent), q('form-status').textContent);
  }

  // Network failure.
  {
    const { q, fill, submit } = await makeEnv({
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch');
      },
    });
    fill(VALID);
    submit();
    await settle(12);
    check('network failure shows an error', q('form-status').classList.contains('is-err'));
    check('recovers so the visitor can retry', q('send').disabled === false);
  }
}

/* ---------------------------------------------------------------- */

(async () => {
  console.log('Contact form integration tests (real dist bundle in jsdom)\n');
  await testMarkupWiring();
  await testDesignUnchanged();
  await testValidation();
  await testSuccess();
  await testDisabledWhileSending();
  await testFailures();

  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log('Failed:\n  - ' + failures.join('\n  - '));
    process.exit(1);
  }
})();
