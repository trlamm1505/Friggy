import 'dotenv/config';

export const PORT = process.env.PORT;
export const DATABASE_URL = process.env.DATABASE_URL;

console.log(
  '\n',
  {
    PORT,
    DATABASE_URL,
  },
  '\n',
);
