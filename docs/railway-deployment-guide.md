# Railway Deployment Guide - AVNZ Payment Platform

## Overview

This guide walks through deploying the AVNZ Payment Platform to Railway for alpha testing.

**Estimated Cost:** ~$15-25/month
**Setup Time:** ~30 minutes

---

## Step 1: Railway Project Setup (DONE ✅)

You've already completed:
- [x] Railway account created
- [x] Empty project created
- [x] PostgreSQL database added
- [x] Redis database added

### Your Connection Strings

```
DATABASE_URL=postgresql://postgres:***REMOVED***@***REMOVED***:22511/railway
REDIS_URL=redis://default:***REMOVED***@***REMOVED***:17936
```

---

## Step 2: Add Application Services

In your Railway project dashboard:

### 2.1 Add API Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select your `payment-platform` repository
3. Railway will detect the monorepo - select **"Configure"**
4. Set **Root Directory:** `apps/api`
5. Click **"Deploy"**

### 2.2 Add Admin Dashboard Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select same repository
3. Set **Root Directory:** `apps/admin-dashboard`
4. Click **"Deploy"**

### 2.3 Add Company Portal Service

1. Click **"+ New"** → **"GitHub Repo"**
2. Select same repository
3. Set **Root Directory:** `apps/company-portal`
4. Click **"Deploy"**

---

## Step 3: Configure Environment Variables

Click on each service and go to **"Variables"** tab.

### API Service Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:***REMOVED***@***REMOVED***:22511/railway

# Redis
REDIS_URL=redis://default:***REMOVED***@***REMOVED***:17936

# Environment
NODE_ENV=production
PORT=3000

# Security (GENERATE NEW ONES FOR PRODUCTION!)
JWT_SECRET=your-secure-jwt-secret-min-32-chars
INTEGRATION_ENCRYPTION_KEY=generate-64-char-hex-key

# Seed environment (use 'production' for clean DB, 'demo' for test data)
SEED_ENV=demo
```

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Admin Dashboard Variables

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api-service.railway.app
```

### Company Portal Variables

```bash
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-api-service.railway.app
```

---

## Step 4: Generate Public URLs

For each service:

1. Click on the service
2. Go to **"Settings"** tab
3. Click **"Generate Domain"** under "Public Networking"

You'll get URLs like:
- API: `api-production-xxxx.railway.app`
- Admin: `admin-production-xxxx.railway.app`
- Portal: `portal-production-xxxx.railway.app`

**Important:** After generating the API URL, update `NEXT_PUBLIC_API_URL` in the frontend services.

---

## Step 5: Run Database Migrations

After the API deploys successfully:

1. Click on the API service
2. Go to **"Settings"** → **"Custom Command"** (under Deploy section)
3. Temporarily change the start command to:
   ```
   npx prisma migrate deploy && npx prisma db seed && npm run start:prod
   ```
4. Trigger a redeploy
5. After successful seed, change back to:
   ```
   npm run start:prod
   ```

Or use Railway CLI:
```bash
railway run npx prisma migrate deploy
railway run npx prisma db seed
```

---

## Step 6: Verify Deployment

### Check API Health
```bash
curl https://your-api-service.railway.app/health
```

Expected response:
```json
{"status":"ok"}
```

### Access Admin Dashboard
1. Open `https://your-admin-service.railway.app`
2. Login with demo credentials:
   - Email: `admin@avnz.io`
   - Password: `demo123`

### Access Company Portal
1. Open `https://your-portal-service.railway.app`

---

## Custom Domains (Optional)

To use your own domains:

1. Click on service → **"Settings"**
2. Under "Public Networking", click **"+ Custom Domain"**
3. Add your domain (e.g., `api.avnz.io`)
4. Update your DNS with the provided CNAME record

Suggested domain mapping:
- `api.avnz.io` → API service
- `app.avnz.io` → Admin Dashboard
- `portal.avnz.io` → Company Portal

---

## Monitoring & Logs

### View Logs
- Click on any service → **"Logs"** tab
- Logs are real-time and searchable

### Metrics
- Click on any service → **"Metrics"** tab
- View CPU, memory, and network usage

---

## Troubleshooting

### Build Fails
1. Check build logs for errors
2. Verify `Root Directory` is set correctly
3. Ensure Dockerfile exists in the app directory

### Database Connection Issues
1. Verify `DATABASE_URL` is correct
2. Check that PostgreSQL service is running
3. Ensure the API service has access (Railway handles this automatically)

### Frontend Shows API Errors
1. Verify `NEXT_PUBLIC_API_URL` is set correctly
2. Ensure it includes `https://` prefix
3. Redeploy frontend after changing env vars

### CORS Errors
Add your Railway domains to the API's CORS configuration if needed.

---

## Cost Estimate

| Service | Estimated Cost |
|---------|----------------|
| API | $5-10/month |
| Admin Dashboard | $0-5/month |
| Company Portal | $0-5/month |
| PostgreSQL | $5/month |
| Redis | $0-5/month |
| **Total** | **$15-25/month** |

Railway uses usage-based pricing. Costs may vary based on traffic.

---

## Scaling (When Needed)

Railway allows manual scaling:
1. Click on service → **"Settings"**
2. Adjust CPU/Memory limits
3. Add replica count for high availability

---

## Rolling Back

If a deployment breaks:
1. Click on service → **"Deployments"** tab
2. Find the last working deployment
3. Click **"Rollback"**

---

## Next Steps

1. [ ] Add all services to Railway
2. [ ] Configure environment variables
3. [ ] Run database migrations
4. [ ] Verify all services are healthy
5. [ ] Test funnel flows end-to-end
6. [ ] Configure custom domains (optional)

---

*Last Updated: December 11, 2025*
