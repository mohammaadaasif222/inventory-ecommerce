import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { NotificationChannel } from './enums/notification.enum';

interface SendArgs {
  to: string;
  subject: string;
  body: string;
}

/**
 * Actual outbound transports. Email uses Nodemailer; SMS/WhatsApp use the
 * Twilio REST API; Push uses FCM — all via fetch (no heavy SDKs). When a
 * channel is unconfigured the message is logged and treated as delivered in
 * non-production, so local flows don't fail on missing credentials.
 */
@Injectable()
export class NotificationsTransport {
  private readonly logger = new Logger(NotificationsTransport.name);
  private mailer?: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {}

  async send(channel: NotificationChannel, args: SendArgs): Promise<void> {
    switch (channel) {
      case NotificationChannel.EMAIL:
        return this.sendEmail(args);
      case NotificationChannel.SMS:
        return this.sendTwilio(args, false);
      case NotificationChannel.WHATSAPP:
        return this.sendTwilio(args, true);
      case NotificationChannel.PUSH:
        return this.sendPush(args);
    }
  }

  private notConfigured(channel: string): void {
    const isProd = this.config.get<string>('app.nodeEnv') === 'production';
    if (isProd) {
      throw new Error(`${channel} transport is not configured`);
    }
    this.logger.warn(`[dev] ${channel} not configured — message logged only`);
  }

  private async sendEmail(args: SendArgs): Promise<void> {
    const smtp = this.config.get('notifications.smtp') as {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
    };
    if (!smtp.host) return this.notConfigured('EMAIL');
    if (!this.mailer) {
      this.mailer = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      });
    }
    await this.mailer.sendMail({
      from: smtp.from,
      to: args.to,
      subject: args.subject,
      html: args.body,
    });
  }

  private async sendTwilio(args: SendArgs, whatsapp: boolean): Promise<void> {
    const t = this.config.get('notifications.twilio') as {
      accountSid: string;
      authToken: string;
      smsFrom: string;
      whatsappFrom: string;
    };
    if (!t.accountSid || !t.authToken) {
      return this.notConfigured(whatsapp ? 'WHATSAPP' : 'SMS');
    }
    const from = whatsapp ? `whatsapp:${t.whatsappFrom}` : t.smsFrom;
    const to = whatsapp ? `whatsapp:${args.to}` : args.to;
    const auth = Buffer.from(`${t.accountSid}:${t.authToken}`).toString(
      'base64',
    );
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${t.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: from, Body: args.body }),
      },
    );
    if (!res.ok) {
      throw new Error(`Twilio error ${res.status}: ${await res.text()}`);
    }
  }

  private async sendPush(args: SendArgs): Promise<void> {
    const serverKey = this.config.get<string>('notifications.fcm.serverKey');
    if (!serverKey) return this.notConfigured('PUSH');
    const res = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        Authorization: `key=${serverKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: args.to,
        notification: { title: args.subject, body: args.body },
      }),
    });
    if (!res.ok) {
      throw new Error(`FCM error ${res.status}: ${await res.text()}`);
    }
  }
}
