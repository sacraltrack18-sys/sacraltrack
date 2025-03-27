export const emailTemplates = {
  verification: {
    subject: "Verify Your Sacral Track Account",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              text-align: center;
              padding: 20px 0;
              background: linear-gradient(135deg, #3f2d63 0%, #4e377a 100%);
              color: white;
              border-radius: 10px 10px 0 0;
            }
            .content {
              background: #ffffff;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background: linear-gradient(135deg, #3f2d63 0%, #4e377a 100%);
              color: white;
              text-decoration: none;
              border-radius: 25px;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
            }
            .logo {
              max-width: 150px;
              margin-bottom: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://your-domain.com/logo.png" alt="Sacral Track Logo" class="logo">
            <h1>Welcome to Sacral Track!</h1>
          </div>
          
          <div class="content">
            <h2>Verify Your Email Address</h2>
            <p>Hi there! 👋</p>
            <p>Thank you for joining Sacral Track! To start earning royalties and sharing your music with the world, please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="{{verificationUrl}}" class="button">Verify Email Address</a>
            </div>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">{{verificationUrl}}</p>
            
            <p>This link will expire in 24 hours.</p>
            
            <p>Best regards,<br>The Sacral Track Team</p>
          </div>
          
          <div class="footer">
            <p>This email was sent by Sacral Track. If you didn't request this verification, please ignore this email.</p>
          </div>
        </body>
      </html>
    `,
    text: `
      Welcome to Sacral Track!
      
      Hi there! 👋
      
      Thank you for joining Sacral Track! To start earning royalties and sharing your music with the world, please verify your email address by clicking the link below:
      
      {{verificationUrl}}
      
      This link will expire in 24 hours.
      
      Best regards,
      The Sacral Track Team
      
      ---
      This email was sent by Sacral Track. If you didn't request this verification, please ignore this email.
    `
  }
}; 