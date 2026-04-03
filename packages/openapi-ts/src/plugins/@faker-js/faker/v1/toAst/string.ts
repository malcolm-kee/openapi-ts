import type { SchemaWithType } from '@hey-api/shared';

import { $ } from '../../../../../ts-dsl';
import type { Expression, FakerWalkerContext } from '../../shared/types';

/**
 * Generates a faker expression for a string schema, respecting format,
 * pattern, and length constraints.
 *
 * Priority: format > pattern > length constraints > fallback.
 */
export function stringToExpression(
  ctx: FakerWalkerContext,
  schema: SchemaWithType<'string'>,
): Expression {
  // 1. Format-specific faker methods
  const formatExpr = formatToExpression(ctx, schema.format);
  if (formatExpr) {
    return formatExpr;
  }

  // 2. Pattern → faker.helpers.fromRegExp(pattern)
  if (schema.pattern) {
    return ctx.fakerAccessor.attr('helpers').attr('fromRegExp').call($.literal(schema.pattern));
  }

  // 3. Length constraints → faker.string.alpha({ length: { min, max } })
  // faker requires both min and max — fill in sensible defaults when only one is specified
  if (schema.minLength !== undefined || schema.maxLength !== undefined) {
    const min = schema.minLength ?? 0;
    const max = schema.maxLength ?? 1000;
    const lengthObj = $.object().prop('min', $.literal(min)).prop('max', $.literal(max));
    return ctx.fakerAccessor
      .attr('string')
      .attr('alpha')
      .call($.object().prop('length', lengthObj));
  }

  // 4. Fallback
  return ctx.fakerAccessor.attr('string').attr('sample').call();
}

function formatToExpression(
  ctx: FakerWalkerContext,
  format: string | undefined,
): Expression | undefined {
  switch (format) {
    case 'date':
      return ctx.fakerAccessor
        .attr('date')
        .attr('recent')
        .call()
        .attr('toISOString')
        .call()
        .attr('slice')
        .call($.literal(0), $.literal(10));
    case 'date-time':
      return ctx.fakerAccessor.attr('date').attr('recent').call().attr('toISOString').call();
    case 'email':
      return ctx.fakerAccessor.attr('internet').attr('email').call();
    case 'ipv4':
      return ctx.fakerAccessor.attr('internet').attr('ipv4').call();
    case 'ipv6':
      return ctx.fakerAccessor.attr('internet').attr('ipv6').call();
    case 'uri':
    case 'url':
      return ctx.fakerAccessor.attr('internet').attr('url').call();
    case 'uuid':
      return ctx.fakerAccessor.attr('string').attr('uuid').call();
    default:
      return undefined;
  }
}
