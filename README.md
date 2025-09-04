# CMU Web Page Research Platform

A Next.js application for conducting web search behavior research, featuring integrated analytics tracking and a PostgreSQL backend.

## 🚀 Quick Deployment on Vercel

### 1. Deploy to Vercel
1. Connect your GitHub repository to Vercel
2. Or use the Vercel CLI: `npx vercel`

### 2. Add Database
1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Create Database**
3. Choose **Neon** (PostgreSQL) with **Hobby** plan (free)
4. Database URL will be automatically added to environment variables

### 3. Setup Database Schema
After deployment, run locally:
```bash
# Copy DATABASE_URL from Vercel to .env.local
npm run db:push
```

## 🏃‍♂️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Setup database (after adding DATABASE_URL to .env.local)
npm run db:push

# Open database viewer (optional)
npm run db:studio
```

Open [http://localhost:3001](http://localhost:3001) with your browser to see the result.

## 📊 Features

- **Analytics Tracking**: Complete user interaction logging
- **Task Management**: Research task session management
- **Click Tracking**: Detailed click sequence recording
- **Real-time Data**: Live analytics dashboard
- **PostgreSQL Backend**: Integrated API with Prisma ORM

## 🗃️ Database

This project uses PostgreSQL with Prisma ORM. See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed setup instructions.

### API Endpoints
- `GET /api/task-records` - All task records
- `POST /api/task-records` - Create task record
- `GET /api/task-records/task/[taskId]` - Get by task ID
- `PUT /api/task-records/task/[taskId]` - Update task record
- And more... (see DATABASE_SETUP.md)

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL (Neon on Vercel)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Language**: TypeScript

## 📱 Architecture

```
Frontend (Next.js) → API Routes → Prisma → PostgreSQL
```

**No separate backend needed!** The Java Spring Boot backend has been fully migrated to Next.js API routes.

## 🔧 Environment Variables

```env
DATABASE_URL="postgresql://..." # Auto-configured by Vercel
```

## 📋 Migration Notes

This project has been migrated from a Java Spring Boot backend to Next.js API routes. All functionality is preserved while simplifying the deployment architecture.

## 🚨 Vercel Free Tier Limits

- **Database**: 3GB storage (Neon Hobby)
- **Functions**: 10 second timeout
- **Bandwidth**: 100GB/month

Perfect for research projects and prototyping!

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [DATABASE_SETUP.md](./DATABASE_SETUP.md) - Detailed database setup guide