This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Baza (Neon + Drizzle)

Aplikacija bere in piše izključno v Postgres. Pred prvim zagonom skopiraj `.env.example` v
`.env.local` in izpolni `DATABASE_URL`, `AUTH_SECRET` in `SEED_PASSWORD`, nato:

```bash
pnpm db:migrate   # uveljavi migracije iz drizzle/
pnpm db:seed      # napolni projekt "Hiša Podutik" (idempotentno)
pnpm db:reset     # izprazni VSE tabele in na novo napolni
```

`pnpm db:generate` ustvari novo migracijo po spremembi `src/db/schema.ts`.
Poizvedbe so v `src/db/queries.ts`, mutacije (server actions) v `src/app/actions.ts`.
Faze na strani `/timeline` dodajaš, urejaš in odstranjuješ v aplikaciji — seed ustvari samo
izhodiščne štiri. Skupni napredek projekta je povprečje napredka vseh faz.

### Produkcija

Povezavo do produkcijske baze nastavi kot `PROD_DATABASE_URL` v `.env.local` (nikoli v repozitorij):

```bash
pnpm db:migrate:prod                          # migracije na produkciji
PROD_RESET_CONFIRM=1 pnpm db:reset:prod       # izprazni in na novo napolni produkcijo
```

Brez `PROD_RESET_CONFIRM` se izpraznitev zavrne — varovalka pred nesrečnim brisanjem.

## Prijava

Prijava je lastna: geslo je v bazi kot scrypt hash (`users.password_hash`), seja pa je podpisan
HttpOnly piškotek (HMAC z `AUTH_SECRET`, veljavnost 14 dni). `src/proxy.ts` preusmeri vsak
neprijavljen obisk na `/login`; identiteto strani dobijo prek `getSessionUser()`.

Seed ustvari tri uporabnike z geslom iz `SEED_PASSWORD`:

| Ime | E-naslov | Vloga |
| --- | --- | --- |
| Mitja Pak | mitja@bajton.si | Lastnik projekta |
| Julija Pak | julija@bajton.si | Investitorka |
| Darinka Pak | darinka@bajton.si | Investitorka |

Gesla zamenjaj po prvi prijavi; `SEED_PASSWORD` je samo začetno geslo za zasejane račune.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
