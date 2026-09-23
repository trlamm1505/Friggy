/**
 * EmailClientModule — Module dùng chung ClientProxy cho email_queue
 *
 * @Global() nên chỉ cần import 1 lần trong AppModule.
 * Sau đó bất kỳ service nào cũng có thể inject:
 *   @Inject('EMAIL_SERVICE') private readonly emailClient: ClientProxy
 *
 * EmailClientService tự động gọi connect() khi app khởi động.
 */
import {
  Global,
  Module,
  Injectable,
  OnModuleInit,
  Inject,
  Logger,
} from '@nestjs/common';
import { ClientsModule, Transport, ClientProxy } from '@nestjs/microservices';

@Injectable()
export class EmailClientService implements OnModuleInit {
  private readonly logger = new Logger(EmailClientService.name);

  constructor(@Inject('EMAIL_SERVICE') private readonly client: ClientProxy) {}

  async onModuleInit() {
    try {
      await this.client.connect();
      this.logger.log('Email ClientProxy kết nối thành công');
    } catch (err) {
      this.logger.warn(
        `Email ClientProxy kết nối thất bại (sẽ retry tự động): ${err}`,
      );
      // Không throw — ClientProxy tự retry khi emit
    }
  }
}

@Global()
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'EMAIL_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [
            process.env.RABBIT_MQ_URL ?? 'amqp://user:12345@localhost:5673',
          ],
          queue: 'email_queue',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [EmailClientService],
  exports: [ClientsModule],
})
export class EmailClientModule {}
