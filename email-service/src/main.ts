/**
 * main.ts — Khởi động Email Microservice
 * Chạy như NestJS microservice lắng nghe RabbitMQ queue 'email_queue'.
 * Không expose HTTP port.
 */
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBIT_MQ_URL ?? 'amqp://user:12345@localhost:5673'],
      queue: 'email_queue',
      queueOptions: { durable: true },
      prefetchCount: 5,
    },
  });

  await app.listen();
  console.log('📧 Email microservice đang lắng nghe queue: email_queue');
}

bootstrap();
