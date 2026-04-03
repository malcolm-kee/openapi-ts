import type { Expression, FakerWalkerContext } from '../../shared/types';

/**
 * Generates `(options?.faker ?? faker).string.sample()`.
 */
export function stringToExpression(ctx: FakerWalkerContext): Expression {
  return ctx.fakerAccessor.attr('string').attr('sample').call();
}
