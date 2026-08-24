/**
 * @fms/shared — paylaşılan tipler, şemalar, sabitler ve yardımcılar.
 *
 * Bu paket hiçbir şeye bağımlı değildir (bkz. CLAUDE.md 2.4 katman kuralları).
 */
export type { AppPath, BasePathConfig } from './base-path.js';
export {
  apiPath,
  basePath,
  basePathConfig,
  configureBasePath,
  DEFAULT_BASE_PATH,
  deriveBasePathConfig,
  joinBasePath,
  normalizeBasePath,
  resetBasePathForTests,
} from './base-path.js';
export type { Env, EnvIssue } from './env.js';
export {
  checkDatabaseUrlConsistency,
  envSchema,
  formatEnvError,
  loadEnv,
  parseEnv,
} from './env.js';
export type {
  AppErrorOptions,
  ErrorContext,
  ErrorContextValue,
  ErrorKind,
  SerializedAppError,
  SerializedCause,
} from './errors.js';
export {
  AppError,
  DataProviderError,
  DomainError,
  EngineError,
  ERROR_KINDS,
  ForbiddenError,
  isAppError,
  NotFoundError,
  ValidationError,
} from './errors.js';
