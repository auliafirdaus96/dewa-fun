
import nodemailer from 'nodemailer'
import { logger } from './LoggerService'

class EmailService {
  private transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST  || 'smtp.resend.com',
    port:   parseInt(process.env.SMTP_PORT || '465'),
    secure: true,
    auth: {
      user: process.env.SMTP_USER || 'resend',
      pass: process.env.SMTP_PASS || '',
    },
  })

  private from = process.env.EMAIL_FROM || 'noreply@dewa.fun'

  async sendOTP(email: string, otp: string) {
    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: 'dewa.fun — Verifikasi Email',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
            <h2 style="color:#1a1a2e">🎲 dewa.fun</h2>
            <p>Kode verifikasi email Anda:</p>
            <div style="background:#f0f4ff;border-radius:8px;padding:20px;text-align:center;
                        font-size:32px;font-weight:700;letter-spacing:8px;color:#2b6cb0">
              ${otp}
            </div>
            <p style="color:#666;font-size:13px;margin-top:16px">
              Berlaku 10 menit. Jangan bagikan ke siapapun.
            </p>
          </div>
        `,
      })
      logger.info('OTP Email sent successfully', 'EmailService', { email });
    } catch (error) {
      logger.error('Failed to send OTP Email', 'EmailService', { email, error });
    }
  }

  async sendVaultPausedAlert(email: string, mint: string, balance: string) {
    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: '⚠️ dewa.fun — Vault Token Anda Dijeda',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
            <h2 style="color:#1a1a2e">🎲 dewa.fun</h2>
            <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px">
              <strong>⚠️ Vault Dijeda Otomatis</strong>
              <p style="margin:8px 0 0">
                Vault untuk token <code>${mint.slice(0,8)}...</code> telah dijeda karena
                saldo terlalu rendah (<strong>${balance}</strong>).
              </p>
            </div>
            <p style="margin-top:16px">
              Top-up vault Anda di 
              <a href="https://dewa.fun/vault/${mint}">dewa.fun/vault</a>
              untuk melanjutkan game.
            </p>
          </div>
        `,
      })
      logger.warn('Vault Paused Alert sent successfully', 'EmailService', { email, mint });
    } catch (error) {
      logger.error('Failed to send Vault Paused Alert', 'EmailService', { email, mint, error });
    }
  }

  async sendVaultResumedAlert(email: string, mint: string) {
    try {
      await this.transporter.sendMail({
        from:    this.from,
        to:      email,
        subject: '✅ dewa.fun — Vault Token Aktif Kembali',
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px">
            <h2 style="color:#1a1a2e">🎲 dewa.fun</h2>
            <div style="background:#d4edda;border:1px solid #28a745;border-radius:8px;padding:16px">
              <strong>✅ Vault Aktif Kembali</strong>
              <p style="margin:8px 0 0">
                Vault untuk token <code>${mint.slice(0,8)}...</code> sudah aktif kembali
                setelah top-up berhasil.
              </p>
            </div>
          </div>
        `,
      })
      logger.info('Vault Resumed Alert sent successfully', 'EmailService', { email, mint });
    } catch (error) {
      logger.error('Failed to send Vault Resumed Alert', 'EmailService', { email, mint, error });
    }
  }

  async sendDailyAuditReport(email: string, results: any[]) {
    const totalVaults = results.length;
    const failedVaults = results.filter(r => !r.isIntegral).length;
    
    const rows = results.map(r => `
      <tr style="border-bottom:1px solid #eee">
        <td style="padding:10px;font-size:12px;font-family:monospace">${r.mint.slice(0,8)}...</td>
        <td style="padding:10px;font-size:12px;color:${r.isIntegral ? '#28a745' : '#dc3545'};font-weight:bold">
          ${r.isIntegral ? 'PASSED' : 'FAILED'}
        </td>
        <td style="padding:10px;font-size:12px">${r.drift.toFixed(6)}</td>
        <td style="padding:10px;font-size:12px">${r.stats.totalWagered.toFixed(2)}</td>
      </tr>
    `).join('');

    await this.transporter.sendMail({
      from:    this.from,
      to:      email,
      subject: `📊 dewa.fun — Laporan Audit Harian (${new Date().toLocaleDateString()})`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px">
          <h2 style="color:#1a1a2e">🎲 dewa.fun — Daily Audit</h2>
          <div style="display:flex;gap:20px;margin-bottom:24px">
            <div style="flex:1;background:#f8f9fa;padding:15px;border-radius:12px;text-align:center">
              <div style="font-size:10px;color:#666;text-transform:uppercase">Total Vaults</div>
              <div style="font-size:24px;font-weight:900">${totalVaults}</div>
            </div>
            <div style="flex:1;background:${failedVaults > 0 ? '#fff5f5' : '#f0fff4'};padding:15px;border-radius:12px;text-align:center">
              <div style="font-size:10px;color:#666;text-transform:uppercase">Anomalies</div>
              <div style="font-size:24px;font-weight:900;color:${failedVaults > 0 ? '#e53e3e' : '#38a169'}">${failedVaults}</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr style="background:#f1f1f1;text-align:left">
                <th style="padding:10px;font-size:11px;text-transform:uppercase">Vault</th>
                <th style="padding:10px;font-size:11px;text-transform:uppercase">Status</th>
                <th style="padding:10px;font-size:11px;text-transform:uppercase">Drift</th>
                <th style="padding:10px;font-size:11px;text-transform:uppercase">Volume</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `,
    });
    logger.info('Daily Audit Report Email sent', 'EmailService', { email, totalVaults, failedVaults });
  }
}

export const emailService = new EmailService()
