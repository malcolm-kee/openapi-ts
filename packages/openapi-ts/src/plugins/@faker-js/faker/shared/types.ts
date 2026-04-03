import type ts from 'typescript';

import type { $ } from '../../../../ts-dsl';
import type { MaybeTsDsl } from '../../../../ts-dsl/base';

/**
 * Any DSL node or raw TS node that represents an expression.
 * Broad enough to accept ExprTsDsl, CallTsDsl, ObjectTsDsl, LiteralTsDsl, etc.
 */
export type Expression = MaybeTsDsl<ts.Expression>;

/**
 * Result from walking a schema node.
 */
export interface FakerResult {
  expression: Expression;
  /** Whether the expression depends on the `options` parameter (faker accessor or $ref call). */
  usesFaker: boolean;
}

/**
 * Context carried through the walker for building faker expressions.
 */
export interface FakerWalkerContext {
  /**
   * The `(options?.faker ?? faker)` accessor expression.
   * All leaf nodes chain `.attr()` / `.call()` on this.
   */
  fakerAccessor: ReturnType<typeof $.expr>;
  /**
   * The `options` identifier, used when calling referenced factories.
   */
  optionsId: ReturnType<typeof $.expr>;
}
