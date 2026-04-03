import type { SchemaVisitorContext, SchemaWithType, Walker } from '@hey-api/shared';
import { childContext, deduplicateSchema } from '@hey-api/shared';

import { $ } from '../../../../../ts-dsl';
import type { Expression, FakerResult, FakerWalkerContext } from '../../shared/types';
import type { FakerJsFakerPlugin } from '../../types';

/**
 * Generates `(options?.faker ?? faker).helpers.multiple(() => <item expr>)`.
 */
export function arrayToExpression({
  fakerCtx,
  schema,
  walk,
  walkerCtx,
}: {
  fakerCtx: FakerWalkerContext;
  schema: SchemaWithType<'array'>;
  walk: Walker<FakerResult, FakerJsFakerPlugin['Instance']>;
  walkerCtx: SchemaVisitorContext<FakerJsFakerPlugin['Instance']>;
}): Expression {
  let normalizedSchema: SchemaWithType<'array'> = schema;
  if (normalizedSchema.items) {
    normalizedSchema = deduplicateSchema({ schema: normalizedSchema }) as SchemaWithType<'array'>;
  }

  let itemExpr: Expression;

  if (normalizedSchema.items && normalizedSchema.items.length > 0) {
    const result = walk(normalizedSchema.items[0]!, childContext(walkerCtx, 'items', 0));
    itemExpr = result.expression;
  } else {
    itemExpr = $('undefined');
  }

  const callback = $.func().arrow().do($.return(itemExpr));

  // faker requires both min and max — fill in sensible defaults when only one is specified
  if (schema.minItems !== undefined || schema.maxItems !== undefined) {
    const min = schema.minItems ?? 0;
    const max = schema.maxItems ?? 1000;
    const countObj = $.object().prop('min', $.literal(min)).prop('max', $.literal(max));
    const options = $.object().prop('count', countObj);
    return fakerCtx.fakerAccessor.attr('helpers').attr('multiple').call(callback, options);
  }

  return fakerCtx.fakerAccessor.attr('helpers').attr('multiple').call(callback);
}
