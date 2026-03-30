import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";

export const validateConfig = <T extends object>(
  configClass: ClassConstructor<T>,
  config: Record<string, unknown>,
): T => {
  const validatedConfig = plainToInstance(configClass, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  return validatedConfig;
};
