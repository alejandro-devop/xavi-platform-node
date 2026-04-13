/**
 * Email Template: Verification Code
 *
 * This template generates the HTML for the OTP verification email.
 * You can easily customize the styles, colors, and layout here.
 */

interface VerificationEmailParams {
  name: string;
  code: string;
  expirationMinutes: number;
  // logoUrl?: string; // Uncommment when you have a logo
}

export function generateVerificationEmailHTML(params: VerificationEmailParams): string {
  const { name, code, expirationMinutes } = params;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificación de Cuenta</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f4f7;
      color: #333333;
    }
    .email-container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo-placeholder {
      /* Space reserved for logo */
      /* Uncomment when logo is available */
      /* width: 120px; */
      /* height: auto; */
      /* margin-bottom: 20px; */
    }
    .header-title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 600;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #333333;
      margin: 0 0 20px 0;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #555555;
      margin: 0 0 30px 0;
    }
    .otp-container {
      background-color: #f8f9fa;
      border: 2px dashed #667eea;
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      margin: 30px 0;
    }
    .otp-label {
      font-size: 14px;
      color: #666666;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .otp-code {
      font-size: 42px;
      font-weight: 700;
      color: #667eea;
      letter-spacing: 8px;
      font-family: 'Courier New', monospace;
      margin: 10px 0;
    }
    .expiration {
      font-size: 13px;
      color: #999999;
      margin-top: 15px;
    }
    .warning {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      font-size: 14px;
      color: #856404;
    }
    .footer {
      background-color: #f8f9fa;
      padding: 25px 30px;
      text-align: center;
      font-size: 13px;
      color: #666666;
      border-top: 1px solid #e9ecef;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .email-container {
        margin: 0;
        border-radius: 0;
      }
      .content {
        padding: 30px 20px;
      }
      .otp-code {
        font-size: 36px;
        letter-spacing: 6px;
      }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <div class="header">
      <!-- Logo placeholder - uncomment when logo is available -->
      <!-- <img src="YOUR_LOGO_URL" alt="Xavi Platform Logo" class="logo-placeholder"> -->
      <h1 class="header-title">Xavi Platform</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <p class="greeting">¡Hola ${name}! 👋</p>
      
      <p class="message">
        Gracias por registrarte en Xavi Platform. Para completar tu registro y verificar tu cuenta,
        usa el siguiente código de verificación:
      </p>

      <!-- OTP Box -->
      <div class="otp-container">
        <div class="otp-label">Código de Verificación</div>
        <div class="otp-code">${code}</div>
        <div class="expiration">⏱️ Este código expira en ${expirationMinutes} minutos</div>
      </div>

      <p class="message">
        Ingresa este código en la aplicación para activar tu cuenta y comenzar a usar todas las funcionalidades.
      </p>

      <!-- Warning -->
      <div class="warning">
        <strong>⚠️ Importante:</strong> Si no solicitaste este código, puedes ignorar este correo de forma segura.
        Tu cuenta permanecerá protegida.
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p>
        Este es un correo automático, por favor no respondas a este mensaje.
      </p>
      <p>
        © ${new Date().getFullYear()} Xavi Platform. Todos los derechos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateVerificationEmailText(params: VerificationEmailParams): string {
  const { name, code, expirationMinutes } = params;

  return `
¡Hola ${name}!

Gracias por registrarte en Xavi Platform.

Tu código de verificación es: ${code}

Este código expira en ${expirationMinutes} minutos.

Ingresa este código en la aplicación para activar tu cuenta.

Si no solicitaste este código, puedes ignorar este correo de forma segura.

---
© ${new Date().getFullYear()} Xavi Platform
  `.trim();
}
