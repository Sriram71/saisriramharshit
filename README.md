# Sai Sriram Harshit Javvadi — Portfolio

Personal portfolio site. Computer Science graduate (SRM University-AP, 2026)
working in Python, machine learning, data engineering and cloud.

**Live site:** _not deployed yet_ — see [Deployment](#deployment)

---

## What this is

A single-page portfolio covering projects, published research, internships,
education, certifications and achievements, with a contact form that delivers
straight to my inbox.

Built deliberately without a UI framework. It is one hand-written HTML file plus
a small ES module, bundled by Vite — roughly 68 KB of HTML and 8 KB of
JavaScript, no runtime dependencies shipped to the browser beyond the EmailJS
SDK. For a static portfolio, React would have cost more than it returned.

## Features

- **Six project case studies** in a filterable grid, each opening a detail modal
  covering the problem, my role, key features and the stack.
- **Research section** for LungCD, a multimodal clinical AI system for lung
  disease classification, presented at AICCoNS 2026 and communicated to
  IEEE TEMSCON-ASPAC 2026.
- **Working contact form** — client-side validation, no page reload, delivery via
  EmailJS, with the sender set as Reply-To so replies reach the visitor directly.
  Handles rate limits, network failure and unconfigured credentials distinctly.
- **Light and dark themes**, following the system preference by default.
- **A motion system** rather than scattered effects: four duration tokens and two
  easing curves drive every transition on the site. Staggered section entrances,
  hover and press feedback on all controls, animated modal.
- **Accessible by default** — semantic landmarks, keyboard-navigable modal with
  focus management, visible focus rings, `aria-live` form feedback, and full
  `prefers-reduced-motion` support.
- **Responsive** from 320 px upward.

## Tech stack

| Area | Choice |
| --- | --- |
| Markup / styling | Hand-written HTML5, modern CSS (custom properties, grid, `clamp()`) |
| Behaviour | Vanilla JavaScript (ES modules), no framework |
| Build | Vite 5 |
| Email delivery | EmailJS + Gmail, no backend |
| Testing | jsdom, custom assertion harness |
| Fonts | Archivo, IBM Plex Sans, IBM Plex Mono |

## Project structure

```
.
├─ index.html            the entire site — markup, styles, behaviour
├─ public/
│  └─ portrait.jpg       copied to the build root as-is
├─ src/
│  └─ contact.js         form validation + EmailJS submission
├─ test/
│  └─ contact.test.js    60 integration assertions
├─ .env.example          the three config values required
├─ vite.config.js
└─ SETUP.md              EmailJS configuration guide
```

## Running locally

```bash
npm install
cp .env.example .env     # PowerShell: Copy-Item .env.example .env
npm run dev              # http://localhost:5173
```

The site runs without configuration. The contact form validates normally but
reports that it is not configured until you supply EmailJS credentials — see
[SETUP.md](./SETUP.md).

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built output |
| `npm run test:contact` | Contact form integration tests |

## Testing

```bash
npm run build && npm run test:contact
```

The suite loads the **real production bundle** into jsdom with `fetch`
intercepted, so it exercises the shipped code rather than a reimplementation.
60 assertions cover validation rules, no-reload submission, button disabling,
duplicate-submit protection, the exact payload sent to EmailJS, and the success,
400, 429 and offline states. No email is sent, so it costs nothing against the
EmailJS quota.

## Configuration

Three environment variables, all read from `.env`:

```dotenv
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

`.env` is gitignored. These three values are public by design — EmailJS
[documents the Public Key as safe to expose](https://www.emailjs.com/docs/faq/is-it-okay-to-expose-my-public-key/),
and Vite inlines them into the browser bundle. What actually prevents abuse is
the domain allowlist in the EmailJS dashboard, not secrecy. The EmailJS
**Private Key** is never used by this project and must not be added.

## Deployment

`npm run build` emits a static `dist/` folder deployable anywhere.

Set the three `VITE_EMAILJS_*` variables in the host's environment settings —
the build inlines them, and hosts do not read a local `.env`.

For a GitHub Pages project site, set `base` in `vite.config.js` to
`'/saisriramharshit/'` before building.

## Contact

- **Email** — saisriramharshit@gmail.com
- **LinkedIn** — [sriram-javvadi](https://www.linkedin.com/in/sriram-javvadi-73b422259/)
- **GitHub** — [@Sriram71](https://github.com/Sriram71)

Open to full-time roles in Python, machine learning, data engineering, cloud or
analytics. Available immediately, happy to relocate within India.
