import {
  Hook,
  Provider,
  EvaluationContext,
  ResolutionDetails,
  Logger,
  JsonValue,
} from '@openfeature/server-sdk';

// implement the provider interface
export class BuckeeterProvider implements Provider {
  resolveBooleanEvaluation(
    _flagKey: string,
    _defaultValue: boolean,
    _context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<boolean>> {
    throw new Error('Method not implemented.');
  }
  resolveStringEvaluation(
    _flagKey: string,
    _defaultValue: string,
    _context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<string>> {
    throw new Error('Method not implemented.');
  }
  resolveNumberEvaluation(
    _flagKey: string,
    _defaultValue: number,
    _context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<number>> {
    throw new Error('Method not implemented.');
  }
  resolveObjectEvaluation<T extends JsonValue>(
    _flagKey: string,
    _defaultValue: T,
    _context: EvaluationContext,
    _logger: Logger,
  ): Promise<ResolutionDetails<T>> {
    throw new Error('Method not implemented.');
  }
  // Adds runtime validation that the provider is used with the expected SDK
  public readonly runsOn = 'server';
  readonly metadata = {
    name: 'My Provider',
  } as const;
  // Optional provider managed hooks
  hooks?: Hook[];
}
