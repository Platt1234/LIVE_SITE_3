import { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  }
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { name, email, type, otherType, query } = req.body;

    // Validate required fields
    if (!name || !email || !type || !query || (type === 'other' && !otherType)) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Send notifications to both email addresses
    const notificationEmails = ['joseph@platteneye.co.uk', 'daniel@platteneye.co.uk'];
    
    await Promise.all(notificationEmails.map(notificationEmail => 
      transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: notificationEmail,
        subject: `New Consultation Request from ${name}`,
        text: `
          Name: ${name}
          Email: ${email}
          Type: ${type === 'other' ? otherType : type}
          Query: ${query}
        `,
        html: `
          <h2>New Consultation Request</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Type:</strong> ${type === 'other' ? otherType : type}</p>
          <p><strong>Query:</strong></p>
          <p>${query.replace(/\n/g, '<br>')}</p>
        `,
      })
    ));

    // Send confirmation email to user
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Consultation Request Received - Platteneye Capital',
      text: `
        Dear ${name},

        Thank you for your consultation request. We have received your inquiry and our team will get back to you within 24 hours.

        Best regards,
        Platteneye Capital Team
      `,
      html: `
        <h2>Thank you for your consultation request</h2>
        <p>Dear ${name},</p>
        <p>We have received your inquiry and our team will get back to you within 24 hours.</p>
        <br>
        <p>Best regards,<br>Platteneye Capital Team</p>
      `,
    });

    return res.status(200).json({ 
      success: true,
      message: 'Consultation request submitted successfully' 
    });
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ 
      error: 'Failed to submit consultation request. Please try again later.' 
    });
  }
}