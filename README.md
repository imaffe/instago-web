# Instago Frontend

Test frontend for the Instago API - a screenshot management application with AI-powered features.

## Features

- User authentication (login/signup/logout)
- Screenshot upload
- Screenshot list view with thumbnails
- Screenshot detail view with editing capabilities
- Delete screenshots
- Search screenshots using natural language
- Search history

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `NEXT_PUBLIC_API_URL`: The Instago backend API URL (default: https://instago-server-fbtibvhmga-uc.a.run.app/api/v1)

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Authentication**: Sign up or log in with your email and password
2. **Upload**: Click "Upload" in the navbar to upload screenshots
3. **View**: See all your screenshots on the home page
4. **Search**: Use natural language to search through your screenshots
5. **Edit**: Click on any screenshot to view details and edit tags/notes
6. **Delete**: Remove screenshots from the list or detail view

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Supabase Auth
- Lucide Icons