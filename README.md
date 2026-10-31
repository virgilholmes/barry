# sushiandsyntax
this was our HackGwinnett group

Theme is: Accessibiltly tools for navigating the medical care system for disabled users.

## Development

This project uses Next.js App Router, TypeScript, Tailwind CSS, and ESLint.
Use Node.js 20.9 or newer and npm.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Edit `src/app/page.tsx` to update the homepage.

No environment variables are required to start. If needed, copy `.env.example`
to `.env.local` and add your configuration. Keep secrets out of `NEXT_PUBLIC_`
variables, which are exposed to the browser.

```sh
npm run lint   # Check code quality
npm run build  # Create a production build
npm start      # Serve the production build
```

## Legal pages

The shared footer links to these public pages from every route, including `/app`:

- `/terms-and-conditions`
- `/cookie-policy`
- `/end-user-agreement`

Each page includes a plain-language summary, linked table of contents, and
print-friendly styling. Policy text lives in the corresponding `src/app` route;
shared titles, links, and the last-updated date live in `src/lib/legal.ts`.

Set `BARRY_LEGAL_CONTACT_EMAIL` in `.env.local` (or the deployment environment)
before building to display the team's contact email on all three pages. Without
it, the contact section directs users to the team through whoever provided their
access to Barry. Rebuild after changing the address.

The Cookie Policy reflects the current app: no application cookies, local
storage, session storage, analytics, or advertising trackers. Update it alongside
any feature that changes those practices, and update the policy date when the
documents change.
