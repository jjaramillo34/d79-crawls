# D79 Crawls - Email Setup Instructions

## 🚨 Issue with @schools.nyc.gov App Passwords

Since NYC DOE manages Google Workspace settings, App Passwords may not be available for @schools.nyc.gov accounts.

## ✅ **RECOMMENDED SOLUTION: Use SendGrid (Free)**

SendGrid is a free email service (100 emails/day) that's perfect for this application.

### Step 1: Sign Up for SendGrid

1. Go to: https://signup.sendgrid.com/
2. Sign up with your @schools.nyc.gov email (or any email)
3. Verify your email
4. Choose the **FREE plan** (100 emails/day forever)

### Step 2: Create an API Key

1. Log in to SendGrid
2. Go to **Settings** → **API Keys**
3. Click **"Create API Key"**
4. Name it: `D79 Crawls`
5. Choose **"Full Access"**
6. Click **Create & View**
7. **COPY THE API KEY** (starts with `SG.` - you won't see it again!)

### Step 3: Configure .env.local

Add these lines to your `.env.local` file:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/d79-crawls

# Email Configuration (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=jjaramillo7@schools.nyc.gov
ADMIN_EMAIL=jjaramillo7@schools.nyc.gov
```

**Replace:**
- `SG.your_api_key_here` with the actual API key from Step 2
- `jjaramillo7@schools.nyc.gov` with your email

### Step 4: Verify Sender Email (SendGrid Requirement)

1. In SendGrid, go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in your details:
   - From Name: `District 79 Fall Crawls`
   - From Email Address: `jjaramillo7@schools.nyc.gov`
   - Reply To: `jjaramillo7@schools.nyc.gov`
4. Click **Create**
5. Check your email and click the verification link

### Step 5: Test Your Setup

Run this command:

```bash
npm run test:email
```

If successful, you'll receive a test email!

## 📬 What Happens Now?

When someone registers:
1. **They receive** a beautiful confirmation email with event details
2. **You receive** an admin notification with participant info and remaining spots

## 🔍 Troubleshooting

**"Unauthorized" error?**
- Make sure you copied the full API key (starts with `SG.`)
- Check for extra spaces in .env.local

**"Sender email not verified"?**
- Complete Step 4 above
- Check your email for the verification link from SendGrid

**Emails going to spam?**
- Add your sending email to contacts
- This is normal for new SendGrid accounts - improves over time

## 🎨 Email Templates

Both emails use the #ECC67F theme color and include:
- District 79 branding
- Event details
- Location information
- Important reminders

## 💡 Alternative: Use Your Regular @schools.nyc.gov Password

**⚠️ Only for testing/development:**

If you just want to test quickly, you can try:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=jjaramillo7@schools.nyc.gov
EMAIL_PASSWORD=your-regular-password
EMAIL_FROM=jjaramillo7@schools.nyc.gov
ADMIN_EMAIL=jjaramillo7@schools.nyc.gov
```

**Note:** This may not work if NYC DOE has disabled "Less secure app access"

## 🚀 Running the Application

```bash
npm run dev
```

Visit: http://localhost:3000

## 📚 More Help

- Full email setup guide: `EMAIL_SETUP.md`
- Main documentation: `README.md`

---

**Questions?** Contact Javier Jaramillo at jjaramillo7@schools.nyc.gov
