import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { MailService } from './mail.service';

interface EmailMessage {
  type: 'otp' | 'welcome' | 'subscription_reminder' | 'password_changed';
  to: string;
  data: any;
}

@Controller()
export class MailController {
  private readonly logger = new Logger(MailController.name);

  constructor(private readonly mailService: MailService) {}

  @MessagePattern('email.send')
  async handleEmailSend(@Payload() message: EmailMessage): Promise<void> {
    this.logger.log(`📨 Email task: [${message.type}] → ${message.to}`);
    try {
      switch (message.type) {
        case 'otp':
          await this.mailService.sendOtp(message.to, message.data.otp, message.data.purpose);
          break;
        case 'welcome':
          await this.mailService.sendWelcome(message.to, message.data.name);
          break;
        case 'subscription_reminder':
          await this.mailService.sendSubscriptionReminder(
            message.to,
            message.data.name,
            message.data.planName,
            new Date(message.data.endDate),
          );
          break;
        case 'password_changed':
          await this.mailService.sendPasswordChanged(message.to, message.data.name);
          break;
        default:
          this.logger.warn(`⚠️ Email type không xác định: ${(message as any).type}`);
      }
    } catch (err) {
      this.logger.error(`❌ Email task thất bại: ${err}`);
    }
  }
}
