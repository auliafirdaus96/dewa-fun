import crypto from 'crypto';
import { logger } from './LoggerService';
import * as Sentry from "@sentry/nextjs";

/**
 * IKmsService defines the contract for key management operations.
 */
export interface IKmsService {
  encrypt(text: string): Promise<string>;
  decrypt(encryptedData: string): Promise<string>;
}

/**
 * DewaKmsService implements the KMS logic.
 * In production, this would be replaced or extended to call AWS KMS or GCP Secret Manager.
 */
export class DewaKmsService implements IKmsService {
  private static instance: DewaKmsService;
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 12;
  private readonly masterKey: Buffer;

  private constructor() {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        '[FATAL] ENCRYPTION_KEY environment variable is required for KMS. ' +
        'Must be exactly 32 characters for AES-256.'
      );
    }
    if (key.length < 32) {
      throw new Error('[FATAL] ENCRYPTION_KEY must be at least 32 characters.');
    }
    // AES-256 requires 32 bytes (256 bits)
    this.masterKey = Buffer.from(key.slice(0, 32));
  }

  public static getInstance(): DewaKmsService {
    if (!DewaKmsService.instance) {
      DewaKmsService.instance = new DewaKmsService();
    }
    return DewaKmsService.instance;
  }

  /**
   * Encrypts data and logs the operation for auditing.
   */
  public async encrypt(text: string): Promise<string> {
    if (!text) return '';

    logger.info('Encrypting sensitive data via KMS', 'KmsService');
    
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypts data and logs the operation for auditing.
   */
  public async decrypt(encryptedData: string): Promise<string> {
    if (!encryptedData) return '';

    logger.info('Decrypting sensitive data via KMS', 'KmsService');

    try {
      const [ivHex, authTagHex, encryptedTextHex] = encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedTextHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      logger.error('KMS Decryption failed', 'KmsService', { error });
      Sentry.captureException(error);
      throw new Error('KMS_DECRYPTION_FAILED');
    }
  }
}

export const kms = DewaKmsService.getInstance();
