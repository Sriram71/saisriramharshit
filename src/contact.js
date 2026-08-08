/**
 * Contact form -> EmailJS.
 *
 * Configuration comes from Vite env vars (see .env.example). Nothing secret
 * lives in this file: the EmailJS *Public Key* and the Service/Template IDs are
 * designed to be sent to the browser. The EmailJS *Private Key* must never
 * appear in frontend code and is not used here.
 */

import emailjs from '@emailjs/browser';

const CONFIG = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};

const FALLBACK_EMAIL = 'saisriramharshit@gmail.com';

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

// Deliberately permissive: something@something.tld with no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

const RULES = {
  name: {
    el: 'f-name',
    err: 'e-name',
    check(v) {
      if (!v) return 'Please enter your name.';
      if (v.length < 2) return 'That name looks too short.';
      if (v.length > 100) return 'Please keep your name under 100 characters.';
      return '';
    },
  },
  company: {
    el: 'f-org',
    err: 'e-org',
    check(v) {
      if (!v) return 'Please tell me the company or your role.';
      if (v.length > 120) return 'Please keep this under 120 characters.';
      return '';
    },
  },
  email: {
    el: 'f-email',
    err: 'e-email',
    check(v) {
      if (!v) return 'Please enter your email so I can reply.';
      if (v.length > 180) return 'That email address is too long.';
      if (!EMAIL_RE.test(v)) return 'That does not look like a valid email address.';
      return '';
    },
  },
  message: {
    el: 'f-msg',
    err: 'e-msg',
    check(v) {
      if (!v) return 'Please write a message.';
      if (v.length < 10) return 'Please write at least 10 characters.';
      if (v.length > 4000) return 'Please keep your message under 4000 characters.';
      return '';
    },
  },
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTimestamp(date) {
  // e.g. "8 August 2026 at 17:22 IST" — rendered in the visitor's locale/zone,
  // with the zone name included so the recipient can interpret it.
  try {
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZoneName: 'short',
    }).format(date);
  } catch {
    return date.toString();
  }
}

function setFieldError(rule, message) {
  const input = document.getElementById(rule.el);
  const slot = document.getElementById(rule.err);
  if (slot && slot.textContent !== message) {
    // Reflow so the message re-animates when it changes between two errors.
    slot.textContent = '';
    void slot.offsetWidth;
    slot.textContent = message;
  }
  if (input) {
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
}

function clearAllErrors() {
  Object.values(RULES).forEach((rule) => setFieldError(rule, ''));
}

/* ------------------------------------------------------------------ */
/* wiring                                                              */
/* ------------------------------------------------------------------ */

function init() {
  const form = document.getElementById('contact-form');
  const button = document.getElementById('send');
  const status = document.getElementById('form-status');

  if (!form || !button || !status) return;

  const defaultLabel = button.textContent;

  const setStatus = (kind, text) => {
    status.classList.remove('is-ok', 'is-err');
    // Force a reflow so the entrance animation replays even when the same
    // status kind is set twice in a row (e.g. two failed submits).
    void status.offsetWidth;
    if (kind) status.classList.add(kind === 'ok' ? 'is-ok' : 'is-err');
    status.textContent = text;
  };

  const readValues = () => ({
    name: document.getElementById('f-name').value.trim(),
    company: document.getElementById('f-org').value.trim(),
    email: document.getElementById('f-email').value.trim(),
    message: document.getElementById('f-msg').value.trim(),
  });

  // Validate a field once the visitor has left it, but only after they have
  // already seen an error there — avoids nagging while they are still typing.
  Object.entries(RULES).forEach(([key, rule]) => {
    const input = document.getElementById(rule.el);
    if (!input) return;
    input.addEventListener('blur', () => {
      if (input.getAttribute('aria-invalid') !== 'true') return;
      setFieldError(rule, rule.check(readValues()[key]));
    });
    input.addEventListener('input', () => {
      if (input.getAttribute('aria-invalid') === 'true' && !rule.check(readValues()[key])) {
        setFieldError(rule, '');
      }
    });
  });

  const configured = Boolean(CONFIG.serviceId && CONFIG.templateId && CONFIG.publicKey);
  if (!configured) {
    // Fail loudly in development, gracefully in production.
    console.error(
      '[contact] EmailJS is not configured. Copy .env.example to .env and fill in ' +
        'VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID and VITE_EMAILJS_PUBLIC_KEY.'
    );
  }

  let sending = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Guard against double submits from Enter + click racing each other.
    if (sending) return;

    const values = readValues();

    clearAllErrors();
    let firstInvalid = null;
    Object.entries(RULES).forEach(([key, rule]) => {
      const problem = rule.check(values[key]);
      if (!problem) return;
      setFieldError(rule, problem);
      if (!firstInvalid) firstInvalid = document.getElementById(rule.el);
    });

    if (firstInvalid) {
      setStatus('err', 'Please fix the highlighted fields and try again.');
      firstInvalid.focus();
      return;
    }

    if (!configured) {
      setStatus(
        'err',
        `The contact form is not configured yet. Please email me directly at ${FALLBACK_EMAIL}.`
      );
      return;
    }

    sending = true;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = 'Sending…';
    setStatus(null, '');

    const now = new Date();
    const params = {
      from_name: values.name,
      from_email: values.email,
      company: values.company,
      message: values.message,
      submitted_at: formatTimestamp(now),
      submitted_at_iso: now.toISOString(),
      subject: `New Portfolio Contact — ${values.name} from ${values.company}`,
      page_url: window.location.href,
    };

    try {
      await emailjs.send(CONFIG.serviceId, CONFIG.templateId, params, {
        publicKey: CONFIG.publicKey,
      });

      form.reset();
      clearAllErrors();
      setStatus(
        'ok',
        `Thanks, ${values.name} — your message is on its way. I'll reply to ${values.email} shortly.`
      );
    } catch (error) {
      // EmailJS rejects with { status, text }; network failures reject with an Error.
      const code = error && typeof error === 'object' && 'status' in error ? error.status : null;
      console.error('[contact] EmailJS send failed', code, error && error.text ? error.text : error);

      let detail = "Something went wrong and your message wasn't sent.";
      if (code === 429) {
        detail = 'Too many messages have been sent from here just now.';
      } else if (code === 400 || code === 401 || code === 403 || code === 412) {
        detail = "The contact form is misconfigured and couldn't send your message.";
      } else if (!navigator.onLine) {
        detail = 'You appear to be offline, so your message could not be sent.';
      }

      setStatus('err', `${detail} Please try again, or email me directly at ${FALLBACK_EMAIL}.`);
    } finally {
      sending = false;
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = defaultLabel;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
