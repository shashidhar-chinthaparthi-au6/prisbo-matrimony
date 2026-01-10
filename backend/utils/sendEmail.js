import AWS from 'aws-sdk';

// Configure AWS SES
const sesConfig = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || process.env.AWS_SES_REGION || 'us-east-1',
};

// Create SES instance
const ses = new AWS.SES(sesConfig);

export const sendEmail = async (options) => {
  // Validate required environment variables
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error('AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables are required');
  }

  // Get sender email (can be from env or use verified SES email)
  const fromEmail = process.env.SES_FROM_EMAIL || process.env.AWS_SES_FROM_EMAIL;
  if (!fromEmail) {
    throw new Error('SES_FROM_EMAIL or AWS_SES_FROM_EMAIL environment variable is required');
  }

  const fromName = process.env.FROM_NAME || 'Prisbo';
  const sender = `${fromName} <${fromEmail}>`;

  // Prepare email parameters
  const params = {
    Source: sender,
    Destination: {
      ToAddresses: [options.email],
    },
    Message: {
      Subject: {
        Data: options.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Text: {
          Data: options.message,
          Charset: 'UTF-8',
        },
        Html: {
          Data: options.html || options.message,
          Charset: 'UTF-8',
        },
      },
    },
  };

  // Send email using SES
  try {
    const result = await ses.sendEmail(params).promise();
    console.log('Email sent successfully via AWS SES:', result.MessageId);
    console.log('Email sent to:', options.email);
    return {
      messageId: result.MessageId,
      ...result,
    };
  } catch (error) {
    console.error('AWS SES Error:', error);
    console.error('Error Code:', error.code);
    console.error('Error Message:', error.message);
    
    // Provide more helpful error messages
    if (error.code === 'MessageRejected') {
      throw new Error(`Email rejected: ${error.message}. Please verify the sender email address in AWS SES.`);
    } else if (error.code === 'ConfigurationSetDoesNotExist') {
      throw new Error(`SES Configuration Set not found: ${error.message}`);
    } else if (error.code === 'InvalidParameterValue') {
      throw new Error(`Invalid email parameter: ${error.message}`);
    } else {
      throw new Error(`Failed to send email via AWS SES: ${error.message}`);
    }
  }
};

