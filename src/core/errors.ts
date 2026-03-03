export class RigError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RigError";
  }
}

export class ConfigError extends RigError {
  constructor(message: string, public readonly field: string) {
    super(message, "CONFIG_ERROR");
    this.name = "ConfigError";
  }
}

export class TemplateError extends RigError {
  constructor(message: string, public readonly templatePath: string) {
    super(message, "TEMPLATE_ERROR");
    this.name = "TemplateError";
  }
}

export class ContentError extends RigError {
  constructor(message: string, public readonly filePath: string) {
    super(message, "CONTENT_ERROR");
    this.name = "ContentError";
  }
}

export class BuildError extends RigError {
  constructor(message: string, public readonly operation: string) {
    super(message, "BUILD_ERROR");
    this.name = "BuildError";
  }
}

export function isRigError(error: unknown): error is RigError {
  return error instanceof RigError;
}

export function createErrorContext(
  operation: string,
  config?: Record<string, unknown>,
  additional?: Record<string, unknown>
): Record<string, unknown> {
  return {
    operation,
    timestamp: new Date().toISOString(),
    config,
    ...additional,
  };
}
