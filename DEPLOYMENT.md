# Netlify Deployment Guide - SplitWise Clone

## Current Setup
- **Frontend**: React app (built in `client/build`)
- **Backend**: Node.js/Express API (requires separate deployment)
- **Database**: MongoDB (requires cloud instance)

## Step 1: Prepare Backend for Deployment

The backend needs to be deployed separately. Options:
- **Render.com** (recommended - free tier available)
- **Railway.app**
- **Heroku** (paid)

### For Render.com:
1. Push your code to GitHub
2. Go to render.com and sign up
3. Create new Web Service
4. Connect your GitHub repo
5. Set Build Command: `npm install`
6. Set Start Command: `npm start`
7. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random string
   - `PORT`: 5000 (Render will override this)

### Get MongoDB Atlas URI:
1. Go to mongodb.com/cloud/atlas
2. Create a free cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/splitwise_clone`

## Step 2: Update Frontend Environment Variables

After deploying backend, update `client/.env.production`:

```
REACT_APP_API_URL=https://your-backend-url.onrender.com/api
```

Then rebuild:
```bash
cd client && npm run build
```

## Step 3: Deploy Frontend to Netlify

### Option A: Using Netlify CLI (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from root directory
netlify deploy --prod
```

### Option B: GitHub/GitLab Integration
1. Push code to GitHub
2. Go to netlify.com
3. Click "Add new site" → "Import existing project"
4. Select your GitHub repo
5. Set Build Command: `cd client && npm run build`
6. Set Publish Directory: `client/build`
7. Add Environment Variable:
   - `REACT_APP_API_URL`: Your backend URL
8. Click Deploy

## Step 4: Update Backend CORS Settings

In `server/server.js`, update CORS to allow Netlify domain:

```javascript
const cors = require('cors');
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-netlify-domain.netlify.app'
  ]
}));
```

## Important Notes

1. **MongoDB**: Set up MongoDB Atlas (cloud version) for production
2. **Environment Variables**: Never commit `.env` files; add them in deployment platform settings
3. **JWT Secret**: Change `your_super_secret_jwt_key_change_in_production` to a secure random string
4. **API URL**: Update after backend deployment
5. **CORS**: Whitelist your Netlify domain in backend CORS settings

## Deployment Order
1. Set up MongoDB Atlas cluster
2. Deploy backend to Render (or similar platform)
3. Get backend URL
4. Update frontend `.env.production` with backend URL
5. Build frontend: `npm run build`
6. Deploy frontend to Netlify

## Testing After Deployment
1. Visit your Netlify domain
2. Try to log in/register
3. Check browser console for API errors
4. Verify API calls go to correct backend URL

## Troubleshooting

**CORS Errors**: Backend domain not whitelisted
- Fix: Add Netlify URL to backend CORS origins

**API 404 Errors**: Wrong API URL in frontend
- Fix: Check `REACT_APP_API_URL` environment variable

**MongoDB Connection Failed**: Connection string invalid
- Fix: Verify MONGO_URI in backend environment variables
