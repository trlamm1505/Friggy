import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { transporter, MAIL_FROM, APP_URL } from '../common/config/mailer';

// ─── Responsive + Dark Mode layout ──────────────────────────────────────────
const layout = (content: string) => `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Friggy</title>
  <style>
    :root { color-scheme: light dark; }

    body {
      margin: 0; padding: 0;
      background-color: #f0faf5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-text-size-adjust: 100%;
    }

    /* Dark mode overrides */
    @media (prefers-color-scheme: dark) {
      body { background-color: #0d1f16 !important; }
      .email-body { background-color: #0d1f16 !important; }
      .card { background-color: #1a2e22 !important; border-color: #2d4a38 !important; }
      .card-header { background: linear-gradient(135deg, #1b4332, #2d6a4f) !important; }
      .card-footer { background-color: #152318 !important; border-color: #2d4a38 !important; }
      .text-body { color: #d1fae5 !important; }
      .text-muted { color: #6ee7b7 !important; }
      .text-subtle { color: #4ade80 !important; }
      .otp-box { background-color: #0f2d1e !important; border-color: #40916c !important; }
      .otp-code { color: #52b788 !important; }
      .warning-box { background-color: #2d2000 !important; border-color: #d97706 !important; }
      .warning-text { color: #fcd34d !important; }
      .info-box { background-color: #0f2d1e !important; border-color: #2d6a4f !important; }
      .danger-box { background-color: #2d0f0f !important; border-color: #ef4444 !important; }
      .danger-text { color: #fca5a5 !important; }
      .btn-primary { background-color: #2d6a4f !important; }
    }

    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 16px 8px !important; }
      .card-header { padding: 24px 20px !important; }
      .card-content { padding: 24px 20px !important; }
      .card-footer { padding: 16px 20px !important; }
      .otp-code { font-size: 32px !important; letter-spacing: 10px !important; }
      .otp-box { padding: 16px 24px !important; }
      .btn-primary { padding: 12px 24px !important; font-size: 14px !important; }
      h2.title { font-size: 20px !important; }
    }
  </style>
</head>
<body class="email-body" style="background-color:#f0faf5;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#f0faf5; padding:40px 16px;">
    <tr><td align="center">
      <table class="card" width="600" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;
                    border:1px solid #d8f3dc;overflow:hidden;
                    box-shadow:0 4px 24px rgba(45,106,79,0.08);">

        <!-- HEADER -->
        <tr>
          <td class="card-header"
              style="background:linear-gradient(135deg,#2d6a4f,#40916c);padding:32px 40px;text-align:center;">
            <div style="font-size:30px;font-weight:800;color:#ffffff;letter-spacing:0.5px;">
              Friggy
            </div>
            <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;letter-spacing:0.3px;">
              Quản lý tủ lạnh thông minh
            </div>
          </td>
        </tr>

        <!-- CONTENT -->
        <tr>
          <td class="card-content text-body"
              style="padding:40px;color:#1b4332;">
            ${content}
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td class="card-footer"
              style="background:#f8fffe;border-top:1px solid #d8f3dc;padding:24px 40px;text-align:center;">
            <p class="text-muted" style="margin:0 0 6px;font-size:13px;color:#52b788;">
              Email này được gửi tự động — vui lòng không trả lời.
            </p>
            <p class="text-subtle" style="margin:0;font-size:12px;color:#74c69d;">
              © 2026 Friggy. All rights reserved.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  async onModuleInit() {
    try {
      await transporter.verify();
      this.logger.log(`✅ SMTP kết nối thành công`);
    } catch (err) {
      this.logger.error(`❌ SMTP kết nối thất bại: ${err}`);
    }
  }

  // ─── OTP ────────────────────────────────────────────────

  async sendOtp(
    to: string,
    otp: string,
    purpose: 'register' | 'reset_password' | 'change_email',
  ): Promise<void> {
    const config: Record<string, { subject: string; title: string; intro: string }> = {
      register: {
        subject: '[Friggy] Mã xác nhận đăng ký tài khoản',
        title: 'Xác nhận đăng ký',
        intro: 'Hoàn tất đăng ký tài khoản Friggy bằng mã OTP sau:',
      },
      reset_password: {
        subject: '[Friggy] Mã đặt lại mật khẩu',
        title: 'Đặt lại mật khẩu',
        intro: 'Sử dụng mã OTP sau để đặt lại mật khẩu của bạn:',
      },
      change_email: {
        subject: '[Friggy] Mã xác nhận đổi email',
        title: 'Xác nhận đổi email',
        intro: 'Sử dụng mã OTP sau để xác nhận đổi email:',
      },
    };

    const { subject, title, intro } = config[purpose];
    await this.send({ to, subject, html: layout(this.otpTemplate(otp, title, intro)) });
    this.logger.log(`✅ OTP [${purpose}] → ${to}`);
  }

  // ─── Chào mừng ─────────────────────────────────────────

  async sendWelcome(to: string, name: string): Promise<void> {
    const content = `
      <h2 class="title" style="margin:0 0 8px;color:#1b4332;font-size:22px;font-weight:700;">
        Xin chào ${name}!
      </h2>
      <p class="text-muted" style="margin:0 0 24px;color:#52b788;font-size:14px;">
        Chào mừng bạn đến với Friggy
      </p>
      <p class="text-body" style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        Tài khoản của bạn đã được tạo thành công. Friggy giúp bạn
        <strong style="color:#2d6a4f;">quản lý tủ lạnh thông minh</strong>,
        cảnh báo thực phẩm sắp hết hạn và lập thực đơn tuần bằng AI.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:32px 0;">
        <tr><td align="center">
          <a class="btn-primary" href="${APP_URL}"
             style="display:inline-block;padding:14px 36px;background:#40916c;color:#ffffff;
                    border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;
                    letter-spacing:0.3px;mso-padding-alt:0;">
            Bắt đầu ngay →
          </a>
        </td></tr>
      </table>
      <p class="text-muted" style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        Trân trọng,<br/>
        <strong style="color:#2d6a4f;">Đội ngũ Friggy</strong>
      </p>`;

    await this.send({ to, subject: 'Chào mừng bạn đến với Friggy!', html: layout(content) });
    this.logger.log(`✅ Welcome email → ${to}`);
  }

  // ─── Nhắc gia hạn ──────────────────────────────────────

  async sendSubscriptionReminder(
    to: string,
    name: string,
    planName: string,
    endDate: Date,
  ): Promise<void> {
    const dateStr = endDate.toLocaleDateString('vi-VN');
    const content = `
      <h2 class="title" style="margin:0 0 8px;color:#1b4332;font-size:22px;font-weight:700;">
        Nhắc nhở gia hạn gói
      </h2>
      <p class="text-body" style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        Xin chào <strong>${name}</strong>,
      </p>
      <table class="info-box" width="100%" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#f0faf5;border:1px solid #d8f3dc;border-radius:12px;
                    margin:0 0 24px;overflow:hidden;">
        <tr>
          <td style="padding:20px 24px;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">Gói dịch vụ của bạn</p>
            <p style="margin:0 0 8px;font-size:22px;font-weight:800;color:#2d6a4f;">${planName}</p>
            <p style="margin:0;font-size:14px;color:#dc6803;">
              Hết hạn vào <strong>${dateStr}</strong> — còn 7 ngày
            </p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
        <tr><td align="center">
          <a class="btn-primary" href="${APP_URL}/subscription"
             style="display:inline-block;padding:14px 36px;background:#40916c;color:#ffffff;
                    border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">
            Gia hạn ngay →
          </a>
        </td></tr>
      </table>
      <p class="text-muted" style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        Trân trọng,<br/>
        <strong style="color:#2d6a4f;">Đội ngũ Friggy</strong>
      </p>`;

    await this.send({
      to,
      subject: `[Friggy] Gói ${planName} sắp hết hạn`,
      html: layout(content),
    });
    this.logger.log(`✅ Subscription reminder → ${to}`);
  }

  // ─── Đổi mật khẩu thành công ───────────────────────────

  async sendPasswordChanged(to: string, name: string): Promise<void> {
    const content = `
      <h2 class="title" style="margin:0 0 8px;color:#1b4332;font-size:22px;font-weight:700;">
        Mật khẩu đã thay đổi
      </h2>
      <p class="text-body" style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        Xin chào <strong>${name}</strong>,
        mật khẩu tài khoản Friggy của bạn vừa được thay đổi thành công.
      </p>
      <table class="danger-box" width="100%" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#fff5f5;border:1px solid #fecaca;border-radius:12px;margin:0 0 24px;overflow:hidden;">
        <tr>
          <td style="padding:16px 20px;">
            <p class="danger-text" style="margin:0;font-size:14px;color:#dc2626;line-height:1.6;">
              Nếu <strong>không phải bạn</strong> thực hiện, tài khoản có thể bị xâm phạm.
              <a href="${APP_URL}/support" style="color:#dc2626;font-weight:600;">Liên hệ hỗ trợ ngay</a>
            </p>
          </td>
        </tr>
      </table>
      <p class="text-muted" style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
        Trân trọng,<br/>
        <strong style="color:#2d6a4f;">Đội ngũ Friggy</strong>
      </p>`;

    await this.send({
      to,
      subject: '[Friggy] Mật khẩu đã được thay đổi',
      html: layout(content),
    });
    this.logger.log(`✅ Password changed email → ${to}`);
  }

  // ─── Private helpers ────────────────────────────────────

  private async send(opts: { to: string; subject: string; html: string }): Promise<void> {
    try {
      const info = await transporter.sendMail({ from: MAIL_FROM, ...opts });
      this.logger.log(`📬 Brevo accepted — messageId: ${info.messageId} | response: ${info.response}`);
    } catch (err) {
      this.logger.error(`❌ Gửi email thất bại → ${opts.to}: ${err}`);
      throw err;
    }
  }

  private otpTemplate(otp: string, title: string, intro: string): string {
    return `
      <h2 class="title" style="margin:0 0 6px;color:#1b4332;font-size:22px;font-weight:700;">${title}</h2>
      <p class="text-muted" style="margin:0 0 24px;color:#52b788;font-size:13px;">
        Mã có hiệu lực trong <strong>5 phút</strong>
      </p>
      <p class="text-body" style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.8;">
        ${intro}
      </p>

      <!-- OTP Box -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
        <tr><td align="center">
          <table class="otp-box" cellpadding="0" cellspacing="0" role="presentation"
                 style="background:#f0faf5;border:2px dashed #40916c;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:24px 48px;text-align:center;">
                <div class="otp-code"
                     style="font-size:42px;font-weight:800;letter-spacing:14px;
                            color:#2d6a4f;font-family:'Courier New',Courier,monospace;
                            line-height:1;">
                  ${otp}
                </div>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>

      <!-- Warning -->
      <table class="warning-box" width="100%" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;
                    margin:0 0 24px;overflow:hidden;">
        <tr>
          <td style="padding:14px 18px;">
            <p class="warning-text" style="margin:0;font-size:13px;color:#92400e;line-height:1.6;">
              <strong>Không chia sẻ mã này với bất kỳ ai.</strong>
              Friggy sẽ không bao giờ hỏi mã OTP của bạn.
            </p>
          </td>
        </tr>
      </table>

      <p class="text-muted" style="margin:0;color:#9ca3af;font-size:13px;">
        Nếu không phải bạn yêu cầu, hãy bỏ qua email này.
      </p>`;
  }

  // ─── Family Invite ────────────────────────────────────

  async sendFamilyInvite(
    to: string,
    ownerName: string,
    inviteToken: string,
    memberName?: string | null,
  ): Promise<void> {
    const appUrl = APP_URL;  // FRONTEND_URL env → mailer.ts → APP_URL constant
    const acceptUrl = `${appUrl}/family/accept?token=${inviteToken}`;
    const rejectUrl = `${appUrl}/family/reject?token=${inviteToken}`;
    const greeting = memberName ? `Chào ${memberName}!` : 'Chào bạn!';

    const content = `
      <h2 class="title" style="margin:0 0 8px;color:#1b4332;font-size:22px;font-weight:700;">
        🏠 Lời mời tham gia Gia đình Friggy
      </h2>
      <p class="text-muted" style="margin:0 0 24px;color:#52b788;font-size:14px;">
        ${greeting}
      </p>
      <p class="text-body" style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        <strong style="color:#2d6a4f;">${ownerName}</strong> đã mời bạn tham gia
        nhóm <strong>Gia đình Friggy</strong>. Khi tham gia, bạn sẽ được hưởng toàn bộ tính năng
        của gói Family — bao gồm AI của bếp, tủ lạnh chia sẻ và thực đơn tuần.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:28px 0 16px;">
        <tr><td align="center">
          <a href="${acceptUrl}"
             style="display:inline-block;padding:14px 36px;background:#2d6a4f;color:#ffffff;
                    text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
             class="btn-primary">
            ✅ Chấp nhận lời mời
          </a>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 24px;">
        <tr><td align="center">
          <a href="${rejectUrl}"
             style="display:inline-block;padding:10px 28px;background:transparent;color:#6b7280;
                    text-decoration:none;border-radius:8px;font-size:13px;border:1px solid #d1d5db;"
          >
            Từ chối
          </a>
        </td></tr>
      </table>
      <p class="text-muted" style="margin:0 0 8px;color:#9ca3af;font-size:12px;text-align:center;">
        Liên kết này sẽ hết hạn sau <strong>48 giờ</strong>.
      </p>
      <p class="text-muted" style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
        Nếu bạn không biết về lời mời này, hãy bỏ qua email này.
      </p>`;

    await this.send({
      to,
      subject: `[Friggy] ${ownerName} mời bạn tham gia Gia đình`,
      html: layout(content),
    });
    this.logger.log(`✅ FamilyInvite → ${to}`);
  }

  // ─── Family Removed ─────────────────────────────────

  async sendFamilyRemoved(to: string): Promise<void> {
    const content = `
      <h2 class="title" style="margin:0 0 8px;color:#1b4332;font-size:22px;font-weight:700;">
        👋 Bạn đã bị xóa khỏi Gia đình Friggy
      </h2>
      <p class="text-body" style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        Chủ gia đình đã xóa bạn khỏi nhóm. Bạn vẫn giữ gói dịch vụ cá nhân của mình.
      </p>
      <p class="text-muted" style="margin:0;color:#9ca3af;font-size:13px;">
        Nếu có thắc mắc, vui lòng liên hệ support@friggy.vn.
      </p>`;

    await this.send({ to, subject: '[Friggy] Bạn đã bị xóa khỏi gia đình', html: layout(content) });
    this.logger.log(`✅ FamilyRemoved → ${to}`);
  }

  // ─── Family Dissolved ────────────────────────────────

  async sendFamilyDissolved(to: string): Promise<void> {
    const content = `
      <h2 class="title" style="margin:0 0 8px;color:#1b4332;font-size:22px;font-weight:700;">
        🏚️ Gia đình Friggy đã giải tán
      </h2>
      <p class="text-body" style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.8;">
        Chủ gia đình đã giải tán nhóm hoặc gói Family đã hết hạn.
        Bạn vẫn giữ toàn bộ gói dịch vụ cá nhân của mình.
      </p>
      <p class="text-muted" style="margin:0;color:#9ca3af;font-size:13px;">
        Cảm ơn bạn đã sử dụng Friggy!
      </p>`;

    await this.send({ to, subject: '[Friggy] Gia đình đã giải tán', html: layout(content) });
    this.logger.log(`✅ FamilyDissolved → ${to}`);
  }
}
