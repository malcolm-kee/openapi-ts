import type { SchemaWithType } from '@hey-api/shared';

import type { Expression, FakerWalkerContext } from '../../shared/types';

/**
 * Generates `(options?.faker ?? faker).number.int()` for integers
 * or `(options?.faker ?? faker).number.float()` for numbers.
 */
export function numberToExpression(
  ctx: FakerWalkerContext,
  schema: SchemaWithType<'integer' | 'number'>,
): Expression {
  const method = schema.type === 'integer' ? 'int' : 'float';
  return ctx.fakerAccessor.attr('number').attr(method).call();
}
