# GovData Import Operations

A production-ready Next.js + TypeScript government import data management platform for ingesting CSV-based trade and customs data, reconciling records against reusable header layouts, and reviewing import quality through a secure authenticated dashboard.

## Features

- Secure credential-based authentication with Auth.js and MongoDB-backed user accounts
- Protected app shell for operations staff, analysts, and reviewers
- CSV intake workflow with validation and basic header-to-layout normalization
- Reusable import layout registry for mapping canonical fields to supplier CSV schemas
- Import batch and record persistence in MongoDB via Mongoose
- Dashboard summaries for throughput, compliance signals, and recent operational actions

## Tech stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- Auth.js v5 with JWT sessions
- PapaParse for CSV parsing
- Zod validation

## Local setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start MongoDB locally or set `MONGODB_URI` to a reachable database.

3. Create a `.env.local` file in the project root with at least:

   ```bash
   AUTH_SECRET=replace-with-a-long-random-secret
   MONGODB_URI=mongodb://127.0.0.1:27017/solardata
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

5. Open http://localhost:3000

## Default app flow

- Landing page: `/`
- Sign in: `/login`
- Registration: `/register`
- Dashboard: `/dashboard`
- CSV intake: `/imports`
- Layout registry: `/layouts`
- Imported records: `/records`

## Notes

- Protected routes are guarded by middleware and an authenticated session.
- The upload workflow creates an `ImportBatch` record and persists matched rows in `ImportRecord` collections.
- The schema and normalization layer is designed to support real import reconciliation workflows, with room to extend validation rules and review states as the product evolves.
