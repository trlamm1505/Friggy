import 'dotenv/config';

export const PORT = process.env.PORT;
export const DATABASE_URL = process.env.DATABASE_URL;
export const NODE_ENV = process.env.NODE_ENV ?? 'development';
export const SWAGGER_PATH = process.env.SWAGGER_PATH ?? 'api/docs';

console.log(
  '\n',
  {
    PORT,
    NODE_ENV,
    DATABASE_URL,
  },
  '\n',
);
