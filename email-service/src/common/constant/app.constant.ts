import 'dotenv/config';

export const EMAIL_HOST = process.env.EMAIL_HOST!;
export const EMAIL_USER = process.env.EMAIL_USER;
export const EMAIL_PASS = process.env.EMAIL_PASS;
export const EMAIL_FROM = process.env.EMAIL_FROM ?? process.env.EMAIL_USER;
export const FRONTEND_URL = process.env.FRONTEND_URL!;
console.log(
  '\n',
  {
    EMAIL_HOST,
    EMAIL_USER: EMAIL_USER ? 'configured' : 'missing',
    EMAIL_PASS: EMAIL_PASS ? 'configured' : 'missing',
    FRONTEND_URL: FRONTEND_URL,
  },
  '\n',
);
