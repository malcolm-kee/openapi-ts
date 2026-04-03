import type { SchemaWithType } from '@hey-api/shared';

import { $ } from '../../../../../ts-dsl';
import type { Expression, FakerWalkerContext } from '../../shared/types';

/**
 * Generates `(options?.faker ?? faker).number.int()` or `.float()`,
 * with optional `{ min, max }` constraints.
 */
export function numberToExpression(
  ctx: FakerWalkerContext,
  schema: SchemaWithType<'integer' | 'number'>,
): Expression {
  const isInteger = schema.type === 'integer';
  const method = isInteger ? 'int' : 'float';

  let min: Expression | undefined;
  let max: Expression | undefined;

  if (schema.exclusiveMinimum !== undefined) {
    min = exclusiveBound(schema.exclusiveMinimum, '+', isInteger);
  } else if (schema.minimum !== undefined) {
    min = $.literal(schema.minimum);
  }

  if (schema.exclusiveMaximum !== undefined) {
    max = exclusiveBound(schema.exclusiveMaximum, '-', isInteger);
  } else if (schema.maximum !== undefined) {
    max = $.literal(schema.maximum);
  }

  if (min !== undefined || max !== undefined) {
    const options = $.object();
    if (min !== undefined) {
      options.prop('min', min);
    }
    if (max !== undefined) {
      options.prop('max', max);
    }
    return ctx.fakerAccessor.attr('number').attr(method).call(options);
  }

  return ctx.fakerAccessor.attr('number').attr(method).call();
}

/**
 * For integers, ±1 converts an exclusive bound to an inclusive one.
 * For floats, pass the bound as-is — faker.number.float() returns
 * continuous random values, so hitting the exact boundary is negligible,
 * and any fixed nudge (±1, ±EPSILON) breaks at some magnitude.
 */
function exclusiveBound(value: number, op: '+' | '-', isInteger: boolean): Expression {
  if (isInteger) {
    return $.literal(op === '+' ? value + 1 : value - 1);
  }
  return $.literal(value);
}
