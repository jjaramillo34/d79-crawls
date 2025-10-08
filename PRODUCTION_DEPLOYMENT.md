# Production Deployment Guide

## 🚀 Deploying D79 Crawls to Production

### Prerequisites

1. **MongoDB Atlas Account** (recommended for production)
2. **Vercel Account** (for hosting)
3. **Environment Variables** configured

### Step 1: Set Up MongoDB Atlas

1. Create a new cluster on [MongoDB Atlas](https://cloud.mongodb.com)
2. Create a database user with read/write permissions
3. Whitelist your IP address (or use 0.0.0.0/0 for Vercel)
4. Get your connection string

### Step 2: Configure Environment Variables

#### For Vercel Deployment:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/d79-crawls?retryWrites=true&w=majority
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=your-email@schools.nyc.gov
ADMIN_EMAIL=your-admin-email@schools.nyc.gov
```

#### For Local Testing with Production DB:

Create `.env.production` file:
```bash
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/d79-crawls?retryWrites=true&w=majority
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=your-email@schools.nyc.gov
ADMIN_EMAIL=your-admin-email@schools.nyc.gov
```

### Step 3: Seed Production Database

#### Option A: From Local Machine (Recommended)

```bash
# Set production environment
export NODE_ENV=production
export MONGODB_URI="your-production-mongodb-uri"

# Run the seed script
node scripts/seed-database.js
```

#### Option B: Force Reset (if data exists)

```bash
# If you need to reset existing data
export NODE_ENV=production
export MONGODB_URI="your-production-mongodb-uri"
export FORCE_RESET=true

node scripts/seed-database.js
```

#### Option C: Using Vercel CLI

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy and run seed script
vercel env pull .env.production
node scripts/seed-database.js
```

### Step 4: Deploy to Vercel

```bash
# Deploy to Vercel
vercel --prod

# Or if using GitHub integration, just push to main branch
git push origin main
```

### Step 5: Verify Deployment

1. **Check Homepage**: Visit your Vercel URL
2. **Test Registration**: Try registering with a @schools.nyc.gov email
3. **Check Database**: Verify data in MongoDB Atlas
4. **Test Email**: Confirm email notifications work

### 🔒 Security Considerations

1. **Never commit** `.env.production` to version control
2. **Use MongoDB Atlas** for production (not local MongoDB)
3. **Enable IP whitelisting** in MongoDB Atlas
4. **Use strong passwords** for database users
5. **Rotate API keys** regularly

### 🐛 Troubleshooting

#### Database Connection Issues
```bash
# Test connection
node -e "
const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.MONGODB_URI);
client.connect().then(() => {
  console.log('✅ Connected to MongoDB');
  client.close();
}).catch(err => {
  console.error('❌ Connection failed:', err.message);
});
"
```

#### Email Issues
```bash
# Test email configuration
npm run test:email
```

#### Build Issues
```bash
# Test build locally
npm run build
```

### 📊 Monitoring

1. **Vercel Analytics**: Monitor performance and errors
2. **MongoDB Atlas**: Monitor database performance
3. **SendGrid**: Monitor email delivery rates

### 🔄 Updates and Maintenance

To update the production database:

1. **Backup first** (MongoDB Atlas has automatic backups)
2. **Test locally** with production database
3. **Deploy changes** to Vercel
4. **Reseed if needed** with new data

```bash
# Update production data
export NODE_ENV=production
export MONGODB_URI="your-production-mongodb-uri"
export FORCE_RESET=true
node scripts/seed-database.js
```

---

## 🆘 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Check MongoDB Atlas logs
3. Test email configuration
4. Contact: jjaramillo7@schools.nyc.gov
