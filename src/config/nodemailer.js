import nodemailer from "nodemailer";

export const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: `Whisper Of Sins ${process.env.SMTP_EMAIL}`,
    to: options?.email,
    subject: options?.subject,
    html: options?.message,
    attachments: options?.attachments,
  };
  await transporter.sendMail(mailOptions);
};
