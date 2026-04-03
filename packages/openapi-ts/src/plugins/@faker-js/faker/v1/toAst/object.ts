import type { SchemaVisitorContext, SchemaWithType, Walker } from '@hey-api/shared';
import { childContext } from '@hey-api/shared';

import { $ } from '../../../../../ts-dsl';
import type { Expression, FakerResult } from '../../shared/types';
import type { FakerJsFakerPlugin } from '../../types';

/**
 * Generates an object literal `{ prop: <walked expr>, ... }`.
 */
export function objectToExpression({
  schema,
  walk,
  walkerCtx,
}: {
  schema: SchemaWithType<'object'>;
  walk: Walker<FakerResult, FakerJsFakerPlugin['Instance']>;
  walkerCtx: SchemaVisitorContext<FakerJsFakerPlugin['Instance']>;
}): Expression {
  const obj = $.object().pretty();

  for (const name in schema.properties) {
    const property = schema.properties[name]!;
    const result = walk(property, childContext(walkerCtx, 'properties', name));
    obj.prop(name, result.expression);
  }

  return obj;
}
