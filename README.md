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

Before `npm run dev`, copy `.env.example` to `.env.local` and fill in the
Supabase and Clerk keys. Keep secrets out of `NEXT_PUBLIC_` variables, which
are exposed to the browser.

```sh
npm test       # Run the unit tests
npm run lint   # Check code quality
npm run build  # Create a production build
npm start      # Serve the production build
```
