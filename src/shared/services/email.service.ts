import { Resend } from 'resend';
import { logger } from '../logger';
import {
  generateVerificationEmailHTML,
  generateVerificationEmailText,
} from '../templates/verification-email';
import {
  generatePasswordResetEmailHTML,
  generatePasswordResetEmailText,
} from '../templates/password-reset-email';

/**
 * Email Service using Resend
 *
 * This service handles all email sending functionality using the Resend API.
 * Configuration is loaded from environment variables.
 */

class EmailService {
  private resend: Resend | null = null;
  private fromEmail: string;
  private isEnabled: boolean;

  constructor() {
    const apiKey = process.env.EMAIL_API_KEY;
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@xavi.app';
    this.isEnabled = !!apiKey;

    if (!apiKey) {
      logger.warn(
        {
          fromEmail: this.fromEmail,
          nodeEnv: process.env.NODE_ENV,
        },
        'EMAIL_API_KEY not configured - email sending is disabled'
      );
      return;
    }

    try {
      this.resend = new Resend(apiKey);
      logger.info(
        {
          fromEmail: this.fromEmail,
          apiKeyPrefix: apiKey.substring(0, 8) + '...',
          nodeEnv: process.env.NODE_ENV,
        },
        'Email service initialized successfully'
      );
    } catch (error) {
      logger.error(
        {
          error,
          fromEmail: this.fromEmail,
        },
        'Failed to initialize Resend email service'
      );
      this.isEnabled = false;
    }
  }

  /**
   * Send verification OTP email to a user
   */
  async sendVerificationEmail(
    email: string,
    code: string,
    name: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isEnabled || !this.resend) {
      const errorMsg = 'Email service is not configured';
      logger.warn({ email }, errorMsg);

      // In development, we might want to continue without failing
      if (process.env.NODE_ENV === 'development') {
        logger.info({ email, code }, 'DEV MODE: Would have sent verification email');
        return { success: true, messageId: 'dev-mode-no-email' };
      }

      return { success: false, error: errorMsg };
    }

    const expirationMinutes = parseInt(process.env.EMAIL_OTP_EXPIRATION_MINUTES || '15', 10);

    try {
      const html = generateVerificationEmailHTML({
        name,
        code,
        expirationMinutes,
      });

      const text = generateVerificationEmailText({
        name,
        code,
        expirationMinutes,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Verifica tu cuenta - Xavi Platform',
        html,
        text,
      });

      if (result.error) {
        logger.error(
          {
            error: result.error,
            email,
            from: this.fromEmail,
            errorName: result.error.name,
            errorMessage: result.error.message,
          },
          'Failed to send verification email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        {
          email,
          messageId: result.data?.id,
          from: this.fromEmail,
        },
        'Verification email sent successfully'
      );
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      logger.error(
        {
          error,
          email,
          from: this.fromEmail,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
        'Error sending verification email'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send password reset OTP email to a user
   */
  async sendPasswordResetEmail(
    email: string,
    code: string,
    name: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isEnabled || !this.resend) {
      const errorMsg = 'Email service is not configured';
      logger.warn({ email }, errorMsg);

      if (process.env.NODE_ENV === 'development') {
        logger.info({ email, code }, 'DEV MODE: Would have sent password reset email');
        return { success: true, messageId: 'dev-mode-no-email' };
      }

      return { success: false, error: errorMsg };
    }

    const expirationMinutes = parseInt(
      process.env.PASSWORD_RESET_OTP_EXPIRATION_MINUTES ||
        process.env.EMAIL_OTP_EXPIRATION_MINUTES ||
        '15',
      10
    );

    try {
      const html = generatePasswordResetEmailHTML({
        name,
        code,
        expirationMinutes,
      });

      const text = generatePasswordResetEmailText({
        name,
        code,
        expirationMinutes,
      });

      const result = await this.resend.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Restablece tu contrasena - Xavi Platform',
        html,
        text,
      });

      if (result.error) {
        logger.error(
          {
            error: result.error,
            email,
            from: this.fromEmail,
            errorName: result.error.name,
            errorMessage: result.error.message,
          },
          'Failed to send password reset email'
        );
        return { success: false, error: result.error.message };
      }

      logger.info(
        {
          email,
          messageId: result.data?.id,
          from: this.fromEmail,
        },
        'Password reset email sent successfully'
      );
      return { success: true, messageId: result.data?.id };
    } catch (error) {
      logger.error(
        {
          error,
          email,
          from: this.fromEmail,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
        'Error sending password reset email'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if email service is properly configured and ready
   */
  isReady(): boolean {
    return this.isEnabled && this.resend !== null;
  }

  /**
   * Get the configured "from" email address
   */
  getFromEmail(): string {
    return this.fromEmail;
  }
}

// Export singleton instance
export const emailService = new EmailService();
