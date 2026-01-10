import dotenv from 'dotenv';
import { sendEmail } from '../utils/sendEmail.js';

// Load environment variables
dotenv.config();

const testEmail = async () => {
  try {
    console.log('Testing AWS SES email functionality...\n');
    console.log('Configuration:');
    console.log('- AWS Region:', process.env.AWS_REGION || 'us-east-1');
    console.log('- From Email:', process.env.SES_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL || 'Not set');
    console.log('- From Name:', process.env.FROM_NAME || 'Prisbo');
    console.log('- AWS Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'Set ✓' : 'Not set ✗');
    console.log('- AWS Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'Set ✓' : 'Not set ✗');
    console.log('\n');

    // Test email
    const testEmailAddress = process.argv[2] || 'shashi@enculture.ai';
    
    console.log(`Sending test email to: ${testEmailAddress}\n`);

    await sendEmail({
      email: testEmailAddress,
      subject: 'Test Email from Prisbo - Password Reset',
      message: `
        This is a test email from Prisbo Matrimony Platform.
        
        If you received this email, it means AWS SES is configured correctly!
        
        This is a test of the password reset email functionality.
      `,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Test Email from Prisbo</h2>
          <p>This is a test email from Prisbo Matrimony Platform.</p>
          <p>If you received this email, it means <strong>AWS SES is configured correctly!</strong></p>
          <p>This is a test of the password reset email functionality.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">This is an automated test email.</p>
        </div>
      `,
    });

    console.log('\n✅ Test email sent successfully!');
    console.log(`Please check the inbox of: ${testEmailAddress}`);
  } catch (error) {
    console.error('\n❌ Error sending test email:');
    console.error(error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY are set in .env');
    console.error('2. Make sure SES_FROM_EMAIL or AWS_SES_FROM_EMAIL is set to a verified email in AWS SES');
    console.error('3. Make sure your AWS credentials have ses:SendEmail permission');
    console.error('4. If in sandbox mode, make sure the recipient email is verified in AWS SES');
    process.exit(1);
  }
};

testEmail();

