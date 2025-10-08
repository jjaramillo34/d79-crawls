// Script to test email configuration
// Run with: node scripts/test-email.js

const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
require('dotenv').config({ path: '.env.local' });

async function testEmail() {
  console.log('🔧 Testing email configuration...\n');
  
  const usingSendGrid = process.env.EMAIL_SERVICE === 'sendgrid' && process.env.SENDGRID_API_KEY;
  
  if (usingSendGrid) {
    // Check SendGrid configuration
    if (!process.env.SENDGRID_API_KEY) {
      console.error('❌ Missing SENDGRID_API_KEY in .env.local');
      console.log('\nPlease add your SendGrid API key to .env.local');
      process.exit(1);
    }
    
    if (!process.env.EMAIL_FROM) {
      console.error('❌ Missing EMAIL_FROM in .env.local');
      console.log('\nPlease add your sender email to .env.local');
      process.exit(1);
    }
    
    console.log('📧 Email Configuration (SendGrid):');
    console.log(`   Service: SendGrid`);
    console.log(`   API Key: ${process.env.SENDGRID_API_KEY.substring(0, 10)}...`);
    console.log(`   From Email: ${process.env.EMAIL_FROM}`);
    console.log(`   Admin Email: ${process.env.ADMIN_EMAIL || 'Not set'}\n`);
  } else {
    // Check SMTP configuration
    const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASSWORD'];
    const missing = requiredVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
      console.error('❌ Missing environment variables:', missing.join(', '));
      console.log('\nPlease add these to your .env.local file.');
      console.log('\nOr use SendGrid by setting:');
      console.log('  EMAIL_SERVICE=sendgrid');
      console.log('  SENDGRID_API_KEY=your_api_key');
      process.exit(1);
    }
    
    console.log('📧 Email Configuration (SMTP):');
    console.log(`   Host: ${process.env.EMAIL_HOST}`);
    console.log(`   Port: ${process.env.EMAIL_PORT}`);
    console.log(`   User: ${process.env.EMAIL_USER}`);
    console.log(`   Admin: ${process.env.ADMIN_EMAIL || 'Not set'}\n`);
  }
  
  const testEmailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #ECC67F; color: white; padding: 20px; text-align: center;">
        <h1>✅ Email Test Successful!</h1>
      </div>
      <div style="padding: 20px; background-color: #ffffff; border: 2px solid #ECC67F;">
        <p>Congratulations! Your email configuration is working correctly.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>Service: ${usingSendGrid ? 'SendGrid' : 'SMTP'}</li>
          ${usingSendGrid ? 
            `<li>From Email: ${process.env.EMAIL_FROM}</li>` : 
            `<li>Host: ${process.env.EMAIL_HOST}</li>
             <li>Port: ${process.env.EMAIL_PORT}</li>
             <li>User: ${process.env.EMAIL_USER}</li>`
          }
        </ul>
        <p>The D79 Crawls registration system is now ready to send email notifications.</p>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
          Test performed at: ${new Date().toLocaleString()}
        </p>
      </div>
    </div>
  `;

  if (usingSendGrid) {
    // Test SendGrid
    try {
      console.log('📨 Sending test email via SendGrid...');
      
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const msg = {
        to: process.env.EMAIL_FROM || process.env.ADMIN_EMAIL,
        from: {
          email: process.env.EMAIL_FROM,
          name: 'District 79 Test'
        },
        subject: 'Test Email - D79 Crawls System (SendGrid)',
        html: testEmailHtml,
      };

      const [response] = await sgMail.send(msg);
      
      console.log('✅ Test email sent successfully via SendGrid!');
      console.log(`   Status Code: ${response.statusCode}`);
      console.log(`\n📬 Check your inbox at: ${process.env.EMAIL_FROM}`);
      console.log('\nYour SendGrid configuration is working correctly! 🎉');
      console.log('\n💡 Tip: If email doesn\'t arrive, check your spam folder.');
      console.log('   It may take a few minutes for the first email to arrive.');
    } catch (error) {
      console.error('❌ Failed to send test email:', error.message);
      
      if (error.code === 401) {
        console.log('\n🔑 Troubleshooting:');
        console.log('1. Check your SENDGRID_API_KEY is correct');
        console.log('2. Make sure the API key starts with "SG."');
        console.log('3. Verify the API key has "Full Access" permissions');
      } else if (error.code === 403) {
        console.log('\n📧 Troubleshooting:');
        console.log('1. Verify your sender email in SendGrid');
        console.log('2. Go to Settings → Sender Authentication');
        console.log('3. Click "Verify a Single Sender"');
        console.log('4. Check your email for verification link');
      }
      
      process.exit(1);
    }
  } else {
    // Test SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    
    // Verify connection
    try {
      console.log('🔌 Testing connection to email server...');
      await transporter.verify();
      console.log('✅ Connection successful!\n');
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\nTroubleshooting tips:');
      console.log('1. Verify your EMAIL_USER and EMAIL_PASSWORD are correct');
      console.log('2. If using Gmail, make sure you created an App Password');
      console.log('3. Check if 2-Factor Authentication is enabled');
      console.log('4. Verify EMAIL_HOST and EMAIL_PORT are correct');
      process.exit(1);
    }
    
    // Send test email
    try {
      console.log('📨 Sending test email via SMTP...');
      const info = await transporter.sendMail({
        from: `"District 79 Test" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: 'Test Email - D79 Crawls System (SMTP)',
        html: testEmailHtml,
      });
      
      console.log('✅ Test email sent successfully!');
      console.log(`   Message ID: ${info.messageId}`);
      console.log(`\n📬 Check your inbox at: ${process.env.EMAIL_USER}`);
      console.log('\nYour email configuration is working correctly! 🎉');
    } catch (error) {
      console.error('❌ Failed to send test email:', error.message);
      process.exit(1);
    }
  }
}

testEmail();
