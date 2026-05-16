interface AccountDeletionEmailParams {
  name: string;
  code: string;
  expirationMinutes: number;
}

export function generateAccountDeletionEmailHTML(params: AccountDeletionEmailParams): string {
  const { name, code, expirationMinutes } = params;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmacion de Eliminacion de Cuenta</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:#f4f4f7;color:#333333;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1);overflow:hidden;">
    <div style="background:linear-gradient(135deg,#dc3545 0%,#8b0000 100%);padding:32px 20px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:28px;font-weight:600;">Xavi Platform</h1>
    </div>
    <div style="padding:36px 30px;">
      <p style="font-size:20px;font-weight:600;margin:0 0 16px 0;">Hola ${name},</p>
      <p style="font-size:16px;line-height:1.6;color:#555555;margin:0 0 24px 0;">
        Recibimos una solicitud para eliminar tu cuenta de forma permanente.
        Usa este codigo OTP para confirmar la eliminacion:
      </p>
      <div style="background:#fff5f5;border:2px dashed #dc3545;border-radius:8px;padding:24px;text-align:center;margin:24px 0;">
        <div style="font-size:14px;color:#666666;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Codigo de Eliminacion</div>
        <div style="font-size:42px;font-weight:700;color:#dc3545;letter-spacing:8px;font-family:'Courier New',monospace;">${code}</div>
        <div style="font-size:13px;color:#999999;margin-top:12px;">Este codigo expira en ${expirationMinutes} minutos</div>
      </div>
      <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px 14px;font-size:14px;color:#856404;">
        Esta accion no se puede deshacer. Si no solicitaste esta eliminacion, ignora este correo.
      </div>
    </div>
    <div style="background:#f8f9fa;padding:20px 30px;text-align:center;font-size:13px;color:#666666;border-top:1px solid #e9ecef;">
      © ${new Date().getFullYear()} Xavi Platform
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function generateAccountDeletionEmailText(params: AccountDeletionEmailParams): string {
  const { name, code, expirationMinutes } = params;

  return `
Hola ${name},

Recibimos una solicitud para eliminar tu cuenta de Xavi Platform.

Tu codigo OTP de eliminacion es: ${code}

Este codigo expira en ${expirationMinutes} minutos.

Esta accion no se puede deshacer. Si no solicitaste esta eliminacion, ignora este correo.

---
© ${new Date().getFullYear()} Xavi Platform
  `.trim();
}
