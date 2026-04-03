import type { SymbolMeta } from '@hey-api/codegen-core';
import { fromRef } from '@hey-api/codegen-core';
import type { SchemaExtractor, SchemaVisitor } from '@hey-api/shared';
import { childContext, pathToJsonPointer } from '@hey-api/shared';

import { $ } from '../../../../ts-dsl';
import { createFakerWalkerContext } from '../shared/faker-expr';
import type { ProcessorContext } from '../shared/processor';
import type { Expression, FakerResult, FakerWalkerContext } from '../shared/types';
import type { FakerJsFakerPlugin } from '../types';
import { arrayToExpression } from './toAst/array';
import { booleanToExpression } from './toAst/boolean';
import { enumToExpression } from './toAst/enum';
import { numberToExpression } from './toAst/number';
import { objectToExpression } from './toAst/object';
import { stringToExpression } from './toAst/string';

export interface VisitorConfig {
  plugin: FakerJsFakerPlugin['Instance'];
  /** Optional schema extractor function. */
  schemaExtractor?: SchemaExtractor<ProcessorContext>;
}

const LITERAL_FALSE: FakerResult = { expression: $('undefined'), usesFaker: false };

export function createVisitor(
  config: VisitorConfig,
): SchemaVisitor<FakerResult, FakerJsFakerPlugin['Instance']> {
  const { plugin, schemaExtractor } = config;
  const fakerCtx: FakerWalkerContext = createFakerWalkerContext(plugin);

  return {
    applyModifiers(result) {
      // M1: no-op — no nullable/optional modifiers yet
      return result;
    },
    array(schema, ctx, walk) {
      return {
        expression: arrayToExpression({
          fakerCtx,
          schema,
          walk,
          walkerCtx: ctx,
        }),
        usesFaker: true,
      };
    },
    boolean() {
      return {
        expression: booleanToExpression(fakerCtx),
        usesFaker: true,
      };
    },
    enum(schema) {
      const expression = enumToExpression(fakerCtx, schema);
      // Empty enums fall back to `undefined` literal — no faker usage
      const hasMembers = schema.items?.some(
        (item) => item.const !== undefined || item.type === 'null',
      );
      return { expression, usesFaker: !!hasMembers };
    },
    integer(schema) {
      return {
        expression: numberToExpression(fakerCtx, schema),
        usesFaker: true,
      };
    },
    intercept(schema, ctx, walk) {
      if (schemaExtractor && !schema.$ref) {
        const extracted = schemaExtractor({
          meta: {
            resource: 'definition',
            resourceId: pathToJsonPointer(fromRef(ctx.path)),
          },
          naming: ctx.plugin.config.definitions,
          path: fromRef(ctx.path),
          plugin: ctx.plugin,
          schema,
        });

        if (extracted !== schema) {
          return walk(extracted, ctx);
        }
      }
    },
    intersection(items) {
      if (items.length > 0) {
        return items[0]!;
      }
      return LITERAL_FALSE;
    },
    never() {
      return LITERAL_FALSE;
    },
    null() {
      return { expression: $.fromValue(null), usesFaker: false };
    },
    number(schema) {
      return {
        expression: numberToExpression(fakerCtx, schema),
        usesFaker: true,
      };
    },
    object(schema, ctx, walk) {
      return {
        expression: objectToExpression({ schema, walk, walkerCtx: ctx }),
        usesFaker: true,
      };
    },
    reference($ref, _schema, ctx) {
      const query: SymbolMeta = {
        category: 'schema',
        resource: 'definition',
        resourceId: $ref,
        tool: 'faker',
      };

      const refSymbol = ctx.plugin.referenceSymbol(query);

      return {
        expression: $(refSymbol).call(fakerCtx.optionsId),
        usesFaker: true,
      };
    },
    string() {
      return {
        expression: stringToExpression(fakerCtx),
        usesFaker: true,
      };
    },
    tuple(schema, ctx, walk) {
      const elements: Array<Expression> = [];
      let anyChildUsesFaker = false;
      for (let i = 0; i < (schema.items?.length ?? 0); i++) {
        const item = schema.items![i]!;
        const result = walk(item, childContext(ctx, 'items', i));
        elements.push(result.expression);
        if (result.usesFaker) anyChildUsesFaker = true;
      }
      return { expression: $.array(...elements), usesFaker: anyChildUsesFaker };
    },
    undefined() {
      return LITERAL_FALSE;
    },
    union(items) {
      if (items.length > 0) {
        return items[0]!;
      }
      return LITERAL_FALSE;
    },
    unknown() {
      return LITERAL_FALSE;
    },
    void() {
      return LITERAL_FALSE;
    },
  };
}
