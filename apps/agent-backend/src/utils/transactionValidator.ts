/**
 * src/utils/transactionValidator.ts
 * Validates external API transactions with signature verification and structure validation
 */

import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { BagsApiError, TransactionError, ValidationError } from './errors.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface BagsTransactionResponse {
  transaction?: string;
  mint?: string;
  signature?: string;
  timestamp?: number;
  feeConfig?: {
    claimersArray: string[];
    basisPointsArray: number[];
  };
  [key: string]: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

// ─── Constants ──────────────────────────────────────────────────────────────────

const BAGS_FM_PUBLIC_KEY = process.env.BAGS_FM_PUBLIC_KEY || '';
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
const TRANSACTION_TIMEOUT = 30000; // 30 seconds

// Circuit breaker state per API endpoint
const circuitBreakerStates = new Map<string, CircuitBreakerState>();

// ─── Signature Verification ─────────────────────────────────────────────────────

/**
 * Verifies Bags.fm API response signature using their public key
 * 
 * @param data - The response data from Bags.fm
 * @param signature - The signature to verify
 * @param publicKey - Bags.fm public key (optional, uses env var if not provided)
 * @returns true if signature is valid
 * @throws BagsApiError if signature verification fails
 */
export function verifyBagsSignature(
  data: any,
  signature: string,
  publicKey?: string
): boolean {
  const bagsPublicKey = publicKey || BAGS_FM_PUBLIC_KEY;

  // If no public key configured, skip verification (dev mode)
  if (!bagsPublicKey) {
    console.warn('[TransactionValidator] BAGS_FM_PUBLIC_KEY not set, skipping signature verification');
    return true;
  }

  try {
    // Convert public key to Uint8Array
    const publicKeyBytes = new PublicKey(bagsPublicKey).toBytes();

    // Prepare message (canonical JSON serialization)
    const messageString = JSON.stringify(data);
    const messageBytes = new TextEncoder().encode(messageString);

    // Convert signature from base64
    const signatureBytes = Buffer.from(signature, 'base64');

    // Verify signature
    const isValid = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);

    if (!isValid) {
      throw new BagsApiError('Signature verification failed - response may be tampered', 401);
    }

    console.log('[TransactionValidator] Signature verified successfully');
    return true;

  } catch (error: any) {
    if (error instanceof BagsApiError) {
      throw error;
    }
    throw new BagsApiError(`Signature verification error: ${error.message}`, 500);
  }
}

// ─── Transaction Structure Validation ───────────────────────────────────────────

/**
 * Validates the structure of a Bags.fm transaction response
 * 
 * @param transaction - The transaction data to validate
 * @returns ValidationResult with validation details
 */
export function validateTransactionStructure(
  transaction: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if transaction exists
  if (!transaction) {
    errors.push('Transaction data is missing or null');
    return { valid: false, errors, warnings };
  }

  // Required fields validation
  if (!transaction.transaction && !transaction.signature) {
    errors.push('Missing required field: transaction or signature');
  }

  if (!transaction.mint) {
    warnings.push('Missing optional field: mint (token address)');
  }

  // Validate transaction format if present
  if (transaction.transaction) {
    if (typeof transaction.transaction !== 'string') {
      errors.push('Field "transaction" must be a string');
    } else if (transaction.transaction.length < 10) {
      warnings.push('Transaction string seems too short');
    }
  }

  // Validate mint address if present
  if (transaction.mint) {
    try {
      new PublicKey(transaction.mint);
    } catch (e: any) {
      errors.push(`Invalid Solana address in "mint": ${e.message}`);
    }
  }

  // Validate fee configuration if present
  if (transaction.feeConfig) {
    if (!Array.isArray(transaction.feeConfig.claimersArray)) {
      errors.push('feeConfig.claimersArray must be an array');
    } else if (transaction.feeConfig.claimersArray.length === 0) {
      warnings.push('feeConfig.claimersArray is empty');
    }

    if (!Array.isArray(transaction.feeConfig.basisPointsArray)) {
      errors.push('feeConfig.basisPointsArray must be an array');
    } else {
      const totalBps = transaction.feeConfig.basisPointsArray.reduce(
        (sum: number, val: number) => sum + val,
        0
      );
      if (totalBps > 10000) {
        errors.push('Total basis points exceeds 100% (10000 bps)');
      }
    }

    // Check arrays have same length
    if (
      Array.isArray(transaction.feeConfig.claimersArray) &&
      Array.isArray(transaction.feeConfig.basisPointsArray) &&
      transaction.feeConfig.claimersArray.length !== transaction.feeConfig.basisPointsArray.length
    ) {
      errors.push('feeConfig arrays must have same length');
    }
  }

  // Validate timestamp if present
  if (transaction.timestamp) {
    const now = Date.now();
    const age = now - transaction.timestamp;
    
    if (age > 300000) { // 5 minutes
      warnings.push(`Transaction timestamp is old (${Math.floor(age / 1000)}s ago)`);
    }
    
    if (age < 0) {
      warnings.push('Transaction timestamp is in the future');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ─── Timeout Handling ───────────────────────────────────────────────────────────

/**
 * Wraps a promise with timeout functionality
 * 
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of operation for error message
 * @returns The result of the promise
 * @throws TransactionError if timeout occurs
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = TRANSACTION_TIMEOUT,
  operationName: string = 'API call'
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new TransactionError(
        `${operationName} timed out after ${timeoutMs}ms`,
        undefined,
        false // Not operational - retry won't help
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    if (timeoutHandle) clearTimeout(timeoutHandle);
    return result;
  } catch (error: any) {
    if (timeoutHandle) clearTimeout(timeoutHandle);
    throw error;
  }
}

// ─── Circuit Breaker Pattern ────────────────────────────────────────────────────

/**
 * Gets or creates circuit breaker state for an endpoint
 */
function getCircuitBreakerState(endpoint: string): CircuitBreakerState {
  if (!circuitBreakerStates.has(endpoint)) {
    circuitBreakerStates.set(endpoint, {
      failures: 0,
      lastFailureTime: null,
      state: 'CLOSED',
    });
  }
  return circuitBreakerStates.get(endpoint)!;
}

/**
 * Records a successful API call
 */
export function recordSuccess(endpoint: string): void {
  const state = getCircuitBreakerState(endpoint);
  state.failures = 0;
  state.state = 'CLOSED';
  state.lastFailureTime = null;
}

/**
 * Records a failed API call and potentially opens circuit breaker
 */
export function recordFailure(endpoint: string): void {
  const state = getCircuitBreakerState(endpoint);
  state.failures++;
  state.lastFailureTime = Date.now();

  if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    state.state = 'OPEN';
    console.warn(
      `[CircuitBreaker] Circuit OPEN for ${endpoint} after ${state.failures} failures`
    );
  }
}

/**
 * Checks if circuit breaker allows request
 * 
 * @param endpoint - The API endpoint
 * @throws BagsApiError if circuit is open
 */
export function checkCircuitBreaker(endpoint: string): void {
  const state = getCircuitBreakerState(endpoint);

  if (state.state === 'OPEN') {
    // Check if enough time has passed to try again (half-open)
    if (state.lastFailureTime && 
        Date.now() - state.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
      state.state = 'HALF_OPEN';
      console.log(`[CircuitBreaker] Circuit HALF_OPEN for ${endpoint}, allowing test request`);
      return;
    }

    throw new BagsApiError(
      `Circuit breaker open for ${endpoint}. Too many failures. Try again in ${CIRCUIT_BREAKER_TIMEOUT / 1000}s`,
      503
    );
  }
}

/**
 * Wraps an API call with circuit breaker logic
 */
export async function withCircuitBreaker<T>(
  endpoint: string,
  apiCall: () => Promise<T>
): Promise<T> {
  // Check circuit before calling
  checkCircuitBreaker(endpoint);

  try {
    const result = await apiCall();
    recordSuccess(endpoint);
    
    // If we were in half-open state, close the circuit
    const state = getCircuitBreakerState(endpoint);
    if (state.state === 'HALF_OPEN') {
      state.state = 'CLOSED';
      console.log(`[CircuitBreaker] Circuit CLOSED for ${endpoint} after successful test`);
    }
    
    return result;
  } catch (error: any) {
    recordFailure(endpoint);
    throw error;
  }
}

// ─── Comprehensive Validation Wrapper ───────────────────────────────────────────

/**
 * Complete validation wrapper for Bags.fm API calls
 * Combines timeout, circuit breaker, and response validation
 * 
 * @param apiCall - The API call to execute
 * @param options - Validation options
 * @returns Validated transaction data
 */
export async function validateBagsTransaction(
  apiCall: () => Promise<BagsTransactionResponse>,
  options: {
    endpoint?: string;
    requireSignature?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<BagsTransactionResponse> {
  const {
    endpoint = 'bags_fm_api',
    requireSignature = false,
    timeoutMs = TRANSACTION_TIMEOUT,
  } = options;

  // Step 1: Check circuit breaker
  checkCircuitBreaker(endpoint);

  // Step 2: Execute with timeout
  let response: Response;
  try {
    response = await withTimeout(
      apiCall() as any, // Type assertion for fetch response
      timeoutMs,
      'Bags.fm API call'
    );
  } catch (error: any) {
    if (error instanceof TransactionError || error instanceof BagsApiError) {
      throw error;
    }
    throw new BagsApiError(`API call failed: ${error.message}`);
  }

  // Step 3: Validate HTTP status
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    recordFailure(endpoint);
    throw new BagsApiError(
      `Bags.fm API returned ${response.status}: ${errorText}`,
      response.status
    );
  }

  // Step 4: Parse and validate structure
  let data: BagsTransactionResponse | undefined;
  try {
    data = await response.json() as BagsTransactionResponse;
  } catch (error: any) {
    throw new BagsApiError(`Failed to parse API response: ${error.message}`);
  }

  if (!data) {
    throw new BagsApiError('API returned empty response');
  }

  const validation = validateTransactionStructure(data);
  
  if (!validation.valid) {
    recordFailure(endpoint);
    throw new ValidationError(
      `Invalid transaction structure: ${validation.errors.join(', ')}`
    );
  }

  // Log warnings but don't fail
  validation.warnings.forEach(warning => {
    console.warn(`[TransactionValidator] Warning: ${warning}`);
  });

  // Step 5: Verify signature if required and available
  if (requireSignature && data.signature) {
    verifyBagsSignature(data, data.signature);
  }

  // Step 6: Record success
  recordSuccess(endpoint);

  return data;
}

// ─── Health Check ───────────────────────────────────────────────────────────────

/**
 * Gets current circuit breaker states for monitoring
 */
export function getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
  const status: Record<string, CircuitBreakerState> = {};
  
  for (const [endpoint, state] of circuitBreakerStates.entries()) {
    status[endpoint] = { ...state };
  }
  
  return status;
}

/**
 * Resets circuit breaker for an endpoint (manual override)
 */
export function resetCircuitBreaker(endpoint: string): void {
  circuitBreakerStates.set(endpoint, {
    failures: 0,
    lastFailureTime: null,
    state: 'CLOSED',
  });
  console.log(`[CircuitBreaker] Manually reset for ${endpoint}`);
}
