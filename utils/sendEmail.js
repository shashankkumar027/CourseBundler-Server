import { createTransport } from "nodemailer";

export const sendEmail = async (to, subject, text) => {
  const transpoter = createTransport({
    host: process.env.SMPT_HOST,
    port: process.env.SMPT_PORT,
    service: process.env.SMPT_SERVICE,
    secure: true,
    requireTLS: true,
    auth: {
      user: process.env.SMPT_MAIL,
      pass: process.env.SMPT_PASSWORD,
    },
  });

  await transpoter.sendMail({
    to,
    subject,
    text,
    from: process.env.SMPT_MAIL,
  });
};
