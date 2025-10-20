import {
  sanitizeArgs,
  sanitizeInput,
} from '../utils/sanitizeInput.util';

// Safe sanitization that doesn't throw errors in development
const safeSanitizeInput = (input: string): string => {
  try {
    return sanitizeInput(input);
  } catch (error) {
    // In development, just clean the input instead of throwing
    return input.replace(/[\r\n]/g, '\\n');
  }
};

const safeSanitizeArgs = (args: unknown[]): unknown[] => {
  try {
    return sanitizeArgs(args);
  } catch (error) {
    // In development, just return the args as strings with cleaned content
    return args.map(arg => String(arg).replace(/[\r\n]/g, '\\n'));
  }
};

const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.log(`[INFO] ${safeSanitizeInput(message)}`, ...safeSanitizeArgs(args));
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${safeSanitizeInput(message)}`, ...safeSanitizeArgs(args));
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[WARN] ${safeSanitizeInput(message)}`, ...safeSanitizeArgs(args));
  },
  debug: (message: string, ...args: unknown[]) => {
    console.debug(`[DEBUG] ${safeSanitizeInput(message)}`, ...safeSanitizeArgs(args));
  },
};

export default logger;
