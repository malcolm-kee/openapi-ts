import type { IR } from '@hey-api/shared';

import type { Expression } from './shared/types';
import type { FakerJsFakerPlugin } from './types';
import { toNodeRefV1, toNodeV1 } from './v1/api';

export type IApi = {
  /**
   * Generate an inline Faker expression for a schema.
   *
   * Returns an expression that produces a valid instance when executed.
   * The returned expression may reference faker symbols (`ensureFaker`,
   * `options`) — cross-plugin references resolve imports automatically.
   *
   * @example
   * ```ts
   * // For { type: 'object', properties: { name: string, email: string } }:
   * {
   *   name: ensureFaker(options).person.fullName(),
   *   email: ensureFaker(options).internet.email()
   * }
   * ```
   */
  toNode(args: { plugin: FakerJsFakerPlugin['Instance']; schema: IR.SchemaObject }): Expression;
  /**
   * Get a reference to an existing Faker factory for a schema.
   *
   * For `$ref` schemas, looks up the registered factory symbol via
   * `referenceSymbol` and returns a call expression (e.g. `fakeUser(options)`).
   * For non-`$ref` schemas, falls back to an inline expression via `toNode`.
   *
   * @example
   * ```ts
   * // For { $ref: '#/components/schemas/User' }:
   * fakeUser(options)
   * ```
   */
  toNodeRef(args: { plugin: FakerJsFakerPlugin['Instance']; schema: IR.SchemaObject }): Expression;
};

export class Api implements IApi {
  toNode(args: { plugin: FakerJsFakerPlugin['Instance']; schema: IR.SchemaObject }): Expression {
    return toNodeV1(args);
  }

  toNodeRef(args: { plugin: FakerJsFakerPlugin['Instance']; schema: IR.SchemaObject }): Expression {
    return toNodeRefV1(args);
  }
}
