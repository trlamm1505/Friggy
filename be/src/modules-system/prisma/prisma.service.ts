import { Injectable } from '@nestjs/common';
import { PrismaClient } from './generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { DATABASE_URL } from 'src/common/constants/app.constant';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const url = new URL(DATABASE_URL as string);

    const adapter = new PrismaMariaDb({
      host: url.hostname,
      user: url.username,
      password: url.password,
      database: url.pathname.substring(1),
      port: Number(url.port),
      connectionLimit: 5,
      allowPublicKeyRetrieval: true,
    });

    super({ adapter });
  }
}
