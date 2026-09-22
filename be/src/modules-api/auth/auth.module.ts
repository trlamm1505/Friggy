import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PrismaModule } from 'src/modules-system/prisma/prisma.module';
import { TokensModule } from 'src/modules-system/tokens/tokens.module';

@Module({
  imports: [
    PrismaModule,
    TokensModule,
    ClientsModule.register([
      {
        name: 'EMAIL_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBIT_MQ_URL ?? 'amqp://user:12345@localhost:5673'],
          queue: 'email_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
