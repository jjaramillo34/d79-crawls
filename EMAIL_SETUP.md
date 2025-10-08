# Email Notification Setup Guide

This guide will help you set up email notifications for the D79 Crawls registration system.

## Overview

The system sends two types of emails:
1. **Confirmation Email** - Sent to the registrant with their registration details
2. **Admin Notification** - Sent to you when someone registers, with participant details and remaining spots

## Email Configuration

### Option 1: Using OAuth2 (Recommended for @schools.nyc.gov)

Since @schools.nyc.gov accounts are managed by NYC DOE and may not allow App Passwords, you can use OAuth2 authentication.

**Note**: This requires additional setup. For simplicity, we'll use Option 2 below.

### Option 2: Using SendGrid (Free Alternative - Recommended)

SendGrid offers a free tier (100 emails/day) which is perfect for this application:

1. **Sign up for SendGrid**:
   - Go to: https://signup.sendgrid.com/
   - Use your @schools.nyc.gov email
   - Free plan: 100 emails/day forever

2. **Create an API Key**:
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it "D79 Crawls"
   - Select "Full Access"
   - Copy the API key (starts with `SG.`)

3. **Add to .env.local file**:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/d79-crawls

# Email Configuration (SendGrid)
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=jjaramillo7@schools.nyc.gov
ADMIN_EMAIL=jjaramillo7@schools.nyc.gov
```

### Option 3: Using Regular Gmail SMTP (If You Have a Personal Gmail)

If you have a personal Gmail account, you can use it to send emails:

1. **Enable 2-Factor Authentication**
2. **Create an App Password**: https://myaccount.google.com/apppasswords
3. **Add to .env.local**:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/d79-crawls

# Email Configuration (Personal Gmail)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-personal-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=jjaramillo7@schools.nyc.gov  # Reply-to address
ADMIN_EMAIL=jjaramillo7@schools.nyc.gov
```

### Option 4: Using Your Regular @schools.nyc.gov Password (Development Only)

**⚠️ WARNING: Only for local development/testing. NOT recommended for production.**

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/d79-crawls

# Email Configuration (@schools.nyc.gov)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=jjaramillo7@schools.nyc.gov
EMAIL_PASSWORD=your-regular-password
ADMIN_EMAIL=jjaramillo7@schools.nyc.gov
```

**Important Notes:**
- This may not work if NYC DOE has "Less secure app access" disabled
- Not secure for production use
- Your password will be in plain text in .env.local

### For Other Email Providers

If you're using a different email provider, update these settings:

```env
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_USER=your-email@schools.nyc.gov
EMAIL_PASSWORD=your-password
ADMIN_EMAIL=jjaramillo7@schools.nyc.gov
```

Common SMTP settings:
- **Office 365**: smtp.office365.com, port 587
- **Outlook**: smtp-mail.outlook.com, port 587
- **Yahoo**: smtp.mail.yahoo.com, port 587

## Email Templates

### Confirmation Email (Sent to Registrant)

Includes:
- ✅ Registration confirmation message
- 📅 Event date, time, and location
- 📝 What to expect at the event
- ⚠️ Important reminders
- 📧 Contact information

### Admin Notification Email (Sent to You)

Includes:
- 👤 Participant name and contact info
- 🏫 School/department
- 📅 Selected crawl date and location
- 📊 Remaining spots (with alert if ≤5 spots left)
- ⏰ Registration timestamp

## Testing Email Notifications

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Register a test user:**
   - Go to http://localhost:3000/register
   - Fill out the form with a valid @schools.nyc.gov email
   - Submit the registration

3. **Check your emails:**
   - The registrant should receive a confirmation email
   - The admin email should receive a notification

## Troubleshooting

### Emails Not Sending

1. **Check your .env.local file:**
   - Ensure all email variables are set
   - Verify there are no typos in the email address
   - Make sure you're using the App Password, not your regular password

2. **Check the server logs:**
   - Look for error messages in the terminal
   - Common errors: "Invalid login", "Connection timeout"

3. **Verify App Password:**
   - Make sure 2FA is enabled on your Google account
   - Regenerate the App Password if needed
   - Remove any spaces when pasting (or keep them exactly as shown)

4. **Firewall/Network:**
   - Ensure port 587 is not blocked
   - Try using port 465 with `secure: true` if 587 doesn't work

### Email Goes to Spam

- Add your sending email to the recipient's contacts
- Check the email content for spam triggers
- Ensure the FROM address matches the EMAIL_USER

## Security Best Practices

1. **Never commit .env.local to Git**
   - It's already in .gitignore
   - Never share your App Password

2. **Use App Passwords**
   - Don't use your main account password
   - Revoke App Passwords when no longer needed

3. **Limit Access**
   - Only give admin notification access to trusted emails
   - Rotate passwords periodically

## Customizing Email Templates

Email templates are located in `/src/lib/email.ts`:

- `getRegistrationConfirmationEmail()` - Confirmation sent to registrant
- `getAdminNotificationEmail()` - Notification sent to admin

You can customize:
- Colors (currently using #ECC67F theme)
- Content and wording
- Logo/branding (add images)
- Additional information

## Production Deployment (Vercel)

When deploying to Vercel:

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add all email configuration variables:
   - `EMAIL_HOST`
   - `EMAIL_PORT`
   - `EMAIL_USER`
   - `EMAIL_PASSWORD`
   - `ADMIN_EMAIL`
4. Redeploy your application

## Support

If you encounter issues:
- Check the server logs for detailed error messages
- Verify all environment variables are correct
- Test with a simple email first
- Contact Javier Jaramillo at jjaramillo7@schools.nyc.gov
