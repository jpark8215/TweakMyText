// Error handling utility for consistent error management
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const handleError = (error: unknown, context: string): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  
  // Convert unknown errors to AppError
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new AppError(message, 'UNKNOWN_ERROR', 'medium');
};

// Secure logging utility that sanitizes sensitive data
export const secureLog = (message: string, data?: any) => {
  if (import.meta.env.DEV) {
    // Sanitize sensitive data in development
    const sanitizedData = data ? sanitizeLogData(data) : undefined;
    console.log(message, sanitizedData);
  }
};

const sanitizeLogData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const sensitive = ['password', 'email', 'token', 'key', 'secret'];
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeLogData(item));
  }
  
  return Object.keys(data).reduce((acc, key) => {
    if (sensitive.some(s => key.toLowerCase().includes(s))) {
      acc[key] = '[REDACTED]';
    } else if (typeof data[key] === 'object') {
      acc[key] = sanitizeLogData(data[key]);
    } else {
      acc[key] = data[key];
    }
    return acc;
  }, {} as any);
};

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export const checkRateLimit = (
  userId: string, 
  action: string, 
  maxAttempts: number = 10, 
  windowMs: number = 60000
): boolean => {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const userLimit = rateLimitMap.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxAttempts) {
    return false;
  }

  userLimit.count++;
  return true;
};