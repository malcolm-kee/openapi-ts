import type { SchemaVisitorContext, SchemaWithType, Walker } from '@hey-api/shared';
import { childContext } from '@hey-api/shared';

import { $ } from '../../../../../ts-dsl';
import type { Expression, FakerResult, FakerWalkerContext } from '../../shared/types';
import type { FakerJsFakerPlugin } from '../../types';

/**
 * Generates an object literal `{ prop: <walked expr>, ... }`.
 *
 * Required properties are always included. Optional properties are
 * conditionally included based on `options.includeOptional`:
 * - `true` or `undefined` (default) — always included
 * - number (0.0-1.0) — included with that probability
 * - `false` — omitted entirely
 */
export function objectToExpression({
  fakerCtx,
  schema,
  walk,
  walkerCtx,
}: {
  fakerCtx: FakerWalkerContext;
  schema: SchemaWithType<'object'>;
  walk: Walker<FakerResult, FakerJsFakerPlugin['Instance']>;
  walkerCtx: SchemaVisitorContext<FakerJsFakerPlugin['Instance']>;
}): Expression {
  const obj = $.object().pretty();
  const requiredSet = new Set(schema.required ?? []);

  for (const name in schema.properties) {
    const property = schema.properties[name]!;
    const result = walk(property, childContext(walkerCtx, 'properties', name));

    if (requiredSet.has(name)) {
      obj.prop(name, result.expression);
    } else {
      // Optional property: conditionally spread based on options.includeOptional
      // Generated: ...(!resolveCondition(options?.includeOptional ?? true, faker) ? {} : { prop: value })
      const includeCondition = $('resolveCondition').call(
        $.binary($(fakerCtx.optionsId).attr('includeOptional').optional(), '??', $.literal(true)),
        fakerCtx.fakerAccessor,
      );
      const propObj = $.object().prop(name, result.expression);
      obj.spread($.ternary($.prefix(includeCondition).not()).do($.object()).otherwise(propObj));
    }
  }

  return obj;
}
