# EmailJS setup

Everything below is done once. Total time: about ten minutes.

The code is already written and tested — you only need to create the EmailJS
account, copy three values into `.env`, and build the template so the email
looks right in your inbox.

---

## 0. Two accounts, and why

There are two separate Google/EmailJS identities in this setup. Keeping them
straight is the only genuinely confusing part, so:

| | Address | Role |
| --- | --- | --- |
| **EmailJS account** | saisriramharshit@gmail.com | Owns the dashboard, billing, quota. You log in as this. |
| **Sending Gmail** | a NEW throwaway Gmail | The account EmailJS actually sends *through*. Never used for anything else. |
| **Recipient** | saisriramharshit@gmail.com | Where the contact form messages land. |

EmailJS has no mail servers of its own — it sends through whatever email account
you connect. If you connect your main Gmail, every submission arrives from you,
to you: it lands in Sent as well as Inbox, Gmail labels the sender "me", and
`from:` filters are useless.

Connecting a **separate** Gmail as the sender fixes all of that. Messages arrive
from a distinct address, your Sent folder stays clean, and you can filter on the
sender. The cost is one throwaway Google account.

---

## 1. Create the two accounts

**1a. The sending Gmail.** Go to <https://accounts.google.com/signup> and create
a new account. Something like `sriram.portfolio.mailer@gmail.com`. Give it a
real password and store it in your password manager — you will need it once,
during step 2, and then effectively never again.

You do not need to check this inbox. Nothing meaningful arrives there.

**1b. The EmailJS account.** Sign up at
<https://dashboard.emailjs.com/sign-up> using your **main** address,
**saisriramharshit@gmail.com**. This is the account you actually manage.

The **Free plan** is enough: 200 emails per month and 2 email templates. No card
required. (If your portfolio ever gets more than ~200 contact form submissions a
month, that is a good problem, and the paid tier starts low.)

---

## 2. The Service ID — connect the sending Gmail

1. Go to **Email Services** → <https://dashboard.emailjs.com/admin>
2. Click **Add New Service** and choose **Gmail**.
3. Click **Connect Account**. A Google account picker opens — **choose the new
   throwaway account from step 1a, not your main one.** This is the step people
   get wrong; if you pick your main Gmail here you are back to self-mail.

   EmailJS uses OAuth, so no password or app-password ends up in this project.
   You are granting the throwaway account permission to send mail, which is
   exactly what it exists for.
4. In **Service ID**, set it to something readable — for example:

   ```
   service_portfolio
   ```

   (If you leave the auto-generated one like `service_ab12cde`, that is fine —
   just copy whatever is shown.)

5. Click **Save**, then **Send test email**. It should land in your **main**
   inbox, sent from the throwaway address. If it arrives from your main address
   instead, you connected the wrong account — delete the service and redo step 3.

**Copy the Service ID.** This is your `VITE_EMAILJS_SERVICE_ID`.

---

## 3. The Template ID — create the email you receive

1. Go to **Email Templates** → <https://dashboard.emailjs.com/admin/templates>
2. Click **Create New Template**.
3. In **Settings**, set the **Template ID** to:

   ```
   template_portfolio_contact
   ```

4. Fill in the **Content** tab exactly as below.

### Subject

```
New Portfolio Contact — {{from_name}} from {{company}}
```

### Content (switch the editor to **Code / HTML** and paste this)

```html
<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#101a20;">
  <p style="margin:0 0 18px;">
    New message from your portfolio contact form.
  </p>

  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td style="padding:6px 18px 6px 0;color:#6a7873;vertical-align:top;">Name</td>
      <td style="padding:6px 0;"><strong>{{from_name}}</strong></td>
    </tr>
    <tr>
      <td style="padding:6px 18px 6px 0;color:#6a7873;vertical-align:top;">Company / role</td>
      <td style="padding:6px 0;">{{company}}</td>
    </tr>
    <tr>
      <td style="padding:6px 18px 6px 0;color:#6a7873;vertical-align:top;">Email</td>
      <td style="padding:6px 0;"><a href="mailto:{{from_email}}">{{from_email}}</a></td>
    </tr>
    <tr>
      <td style="padding:6px 18px 6px 0;color:#6a7873;vertical-align:top;">Submitted</td>
      <td style="padding:6px 0;">{{submitted_at}}</td>
    </tr>
    <tr>
      <td style="padding:6px 18px 6px 0;color:#6a7873;vertical-align:top;">Page</td>
      <td style="padding:6px 0;">{{page_url}}</td>
    </tr>
  </table>

  <div style="border-left:3px solid #b8362f;padding:2px 0 2px 16px;white-space:pre-wrap;">{{message}}</div>

  <p style="margin:24px 0 0;font-size:12px;color:#6a7873;">
    Reply to this email and it goes straight back to {{from_name}}.
  </p>
</div>
```

> `white-space:pre-wrap` on the message block is what preserves the visitor's
> line breaks. Without it, a multi-paragraph message arrives as one blob.

### Email fields (same page, below the content editor)

| Field         | Value                                                    |
| ------------- | -------------------------------------------------------- |
| **To Email**  | `saisriramharshit@gmail.com` ← your **main** address       |
| **From Name** | `{{from_name}}` (or `Portfolio contact form`)             |
| **From Email** | leave "Use Default Email Address" ticked — this resolves to the throwaway account |
| **Reply To**  | `{{from_email}}`  ← **this is the important one**          |
| **Bcc / Cc**  | leave empty                                               |

**Reply-To must be `{{from_email}}`.** That is what lets you hit Reply in Gmail
and have it go to the visitor rather than to EmailJS.

> Do *not* put `{{from_email}}` in the **From Email** field. Gmail will not let
> you send as an arbitrary address, and the send will fail. Reply-To is the
> correct place.

5. Click **Save**.

**Copy the Template ID.** This is your `VITE_EMAILJS_TEMPLATE_ID`.

---

## 4. The Public Key

1. Go to **Account** → **General** → <https://dashboard.emailjs.com/admin/account>
2. Copy the value under **Public Key** (looks like `A1bC2dE3fG4hI5jK6`).

**This is your `VITE_EMAILJS_PUBLIC_KEY`.**

On the same page you will also see a **Private Key**. **Do not copy that one
into this project.** It is a server-side credential that bypasses domain
restrictions. This project never uses it.

### Lock the Public Key to your domain

Still under **Account**, open the **Security** tab
(<https://dashboard.emailjs.com/admin/account/security>) and add your site's
origin to the allowlist, one per line:

```
https://sriram71.github.io
http://localhost:5173
```

Use the format `<scheme>://<hostname>[:<port>]`. This is what stops someone
copying your Public Key out of the page source and burning your quota — add
your real deployed domain here as soon as you have one.

While you are on that page, also switch on **reCAPTCHA** if you start getting
spam. The form code does not need changing for the allowlist; reCAPTCHA would
require a small addition, so leave it off for now.

---

## 5. Where each value goes in the project

Only one place — `.env` at the project root:

```dotenv
VITE_EMAILJS_SERVICE_ID=service_portfolio
VITE_EMAILJS_TEMPLATE_ID=template_portfolio_contact
VITE_EMAILJS_PUBLIC_KEY=A1bC2dE3fG4hI5jK6
```

Create it by copying the committed example:

```powershell
Copy-Item .env.example .env
notepad .env
```

`.env` is listed in `.gitignore`, so it never reaches GitHub. `.env.example`
(no values) is committed so the project documents its own requirements.

`src/contact.js` reads them and nothing else:

```js
const CONFIG = {
  serviceId:  import.meta.env.VITE_EMAILJS_SERVICE_ID,
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
  publicKey:  import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
};
```

There are **no** credentials anywhere in `index.html`, `src/contact.js`, or any
committed file.

---

## 6. The exact template variables

These are the names `src/contact.js` sends. Every `{{...}}` you use in the
EmailJS template must be one of these, spelled identically.

| Variable              | Source                     | Example                                                  |
| --------------------- | -------------------------- | -------------------------------------------------------- |
| `{{from_name}}`       | "Your name" field          | `Priya Raman`                                             |
| `{{company}}`         | "Company or role" field    | `Acme Analytics — Engineering Manager`                    |
| `{{from_email}}`      | "Your email" field         | `priya@acme.com` — **also used as Reply-To**              |
| `{{message}}`         | "Message" field            | the message body, line breaks preserved                   |
| `{{submitted_at}}`    | generated at send time     | `8 August 2026 at 17:22 GMT+5:30`                         |
| `{{submitted_at_iso}}`| generated at send time     | `2026-08-08T11:52:14.028Z` — machine-readable, optional   |
| `{{subject}}`         | generated at send time     | `New Portfolio Contact — Priya Raman from Acme Analytics` |
| `{{page_url}}`        | `window.location.href`     | `https://sriram71.github.io/#contact`                     |

Two notes:

- `{{subject}}` is sent as a convenience, but the Subject line in the template
  above builds the same string from `{{from_name}}` and `{{company}}`. Either
  works — if you prefer, put `{{subject}}` in the Subject field instead.
- The timestamp is the **visitor's** local time with the zone attached, which is
  usually what you want to know. `{{submitted_at_iso}}` is UTC if you'd rather
  have that.

---

## 7. Environment variables — summary

| Variable                  | Committed? | Secret? | Notes                                              |
| ------------------------- | ---------- | ------- | -------------------------------------------------- |
| `VITE_EMAILJS_SERVICE_ID` | No (`.env`) | No     | Designed to be visible in frontend code            |
| `VITE_EMAILJS_TEMPLATE_ID`| No (`.env`) | No     | Same                                                |
| `VITE_EMAILJS_PUBLIC_KEY` | No (`.env`) | No     | Same — protect it with the domain allowlist         |
| EmailJS **Private Key**   | Never       | **Yes** | Not used by this project. Never put it in `.env`.   |
| Gmail password            | Never       | **Yes** | Never needed — EmailJS connects to Gmail via OAuth. |
| Throwaway Gmail password  | Never       | **Yes** | Used once in the EmailJS dashboard. Not in this project. |

Being straight with you about one thing: the `VITE_` prefix is what makes Vite
inject these into the browser bundle, which means anyone can read the three IDs
out of your deployed JavaScript. **That is expected and safe** — [EmailJS
documents the Public Key as safe to expose](https://www.emailjs.com/docs/faq/is-it-okay-to-expose-my-public-key/).
The `.env` file buys you two real things: your keys stay out of git history, and
you can use different EmailJS accounts for local and production. The thing that
actually protects you from abuse is the **domain allowlist in step 4**, so do
not skip it.

If you ever need genuine secrecy for a form, that requires a backend (or a
serverless function) to hold the credential — which is exactly the thing you
said you did not want to maintain.

### Deploying

Hosts do not read your local `.env`, so set the same three variables in the
host's dashboard:

- **Netlify** → Site configuration → Environment variables
- **Vercel** → Project → Settings → Environment Variables
- **GitHub Pages via Actions** → repo Settings → Secrets and variables →
  Actions, then map them in the workflow's `env:` block before `npm run build`

---

## 8. Verifying it works

```powershell
Copy-Item .env.example .env    # then fill in your three values
npm install
npm run dev
```

Open <http://localhost:5173>, scroll to **Contact**, and check each of these:

1. Click **Send** on an empty form → four red field messages, no email sent,
   page does not reload.
2. Type `abc` in the email field → "That does not look like a valid email address."
3. Fill everything in properly and click **Send** → the button greys out and
   reads "Sending…", then a green confirmation appears and the fields clear.
4. Check your **main** Gmail inbox — subject should read
   *New Portfolio Contact — [name] from [company]*, sent from the throwaway
   address (not from yourself).
5. Hit **Reply** in Gmail — the To: field should be the visitor's address,
   not yours and not EmailJS.
6. Turn off your wifi and submit again → a red error telling you to email
   directly instead. The button comes back so you can retry.

An automated version of steps 1–3 and 6 already exists:

```powershell
npm run build
npm run test:contact
```

That runs the real production bundle in a headless DOM with the network
intercepted, and asserts all 58 behaviours (validation, no-reload, button
disabling, duplicate-submit protection, the exact payload sent to EmailJS,
success state, and the 400 / 429 / offline error states). It does not send real
email, so it costs nothing against your quota, and it works with dummy values in
`.env`.
