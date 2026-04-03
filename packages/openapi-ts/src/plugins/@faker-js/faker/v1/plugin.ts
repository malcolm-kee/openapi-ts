import { pathToJsonPointer } from '@hey-api/shared';

import { $ } from '../../../../ts-dsl';
import { irOperationToAst } from '../shared/operation';
import type { EmitTracking } from '../shared/types';
import type { FakerJsFakerPlugin } from '../types';
import { createProcessor } from './processor';

export const handlerV1: FakerJsFakerPlugin['Handler'] = ({ plugin }) => {
  plugin.symbol('faker', {
    external: '@faker-js/faker',
    importKind: 'named',
  });

  plugin.symbol('Faker', {
    external: '@faker-js/faker',
    kind: 'type',
  });

  // Emit shared Options type
  const fakerTypeSymbol = plugin.external('@faker-js/faker.Faker');
  const optionsSymbol = plugin.symbol('Options', { kind: 'type' });
  const optionsType = $.type
    .object()
    .prop('faker', (p) => p.optional().type($.type(fakerTypeSymbol)))
    .prop('includeOptional', (p) =>
      p
        .doc([
          'Whether to include optional properties.',
          'Provide a number between 0 and 1 to randomly include based on that probability.',
          '@default true',
        ])
        .optional()
        .type($.type.or($.type('boolean'), $.type('number'))),
    )
    .prop('useDefault', (p) =>
      p
        .doc([
          'Whether to use schema default values instead of generating fake data.',
          'Provide a number between 0 and 1 to randomly use defaults based on that probability.',
          '@default false',
        ])
        .optional()
        .type($.type.or($.type('boolean'), $.type('number'))),
    );
  plugin.node($.type.alias(optionsSymbol).export().type(optionsType));

  // Reserve slot for resolveCondition — only filled if actually referenced
  const resolveConditionSlot = plugin.node(null);

  // Emit helper: const ensureFaker = (options?: Options): Faker => options?.faker ?? faker
  const fakerSymbol = plugin.external('@faker-js/faker.faker');
  const ensureFakerFn = $.func()
    .arrow()
    .param('options', (p) => p.optional().type('Options'))
    .returns($.type(fakerTypeSymbol))
    .do($.return($.binary($('options').attr('faker').optional(), '??', $(fakerSymbol))));
  const ensureFakerSymbol = plugin.symbol('ensureFaker');
  plugin.node($.const(ensureFakerSymbol).assign(ensureFakerFn));

  const tracking: EmitTracking = { needsResolveCondition: false };
  const processor = createProcessor(plugin, tracking);

  plugin.forEach('operation', 'parameter', 'requestBody', 'schema', (event) => {
    switch (event.type) {
      case 'operation':
        irOperationToAst({
          operation: event.operation,
          path: event._path,
          plugin,
          processor,
          tags: event.tags,
        });
        break;
      case 'parameter':
        processor.process({
          meta: {
            resource: 'definition',
            resourceId: pathToJsonPointer(event._path),
          },
          naming: plugin.config.definitions,
          path: event._path,
          plugin,
          schema: event.parameter.schema,
          tags: event.tags,
        });
        break;
      case 'requestBody':
        processor.process({
          meta: {
            resource: 'definition',
            resourceId: pathToJsonPointer(event._path),
          },
          naming: plugin.config.definitions,
          path: event._path,
          plugin,
          schema: event.requestBody.schema,
          tags: event.tags,
        });
        break;
      case 'schema':
        processor.process({
          meta: {
            resource: 'definition',
            resourceId: pathToJsonPointer(event._path),
          },
          naming: plugin.config.definitions,
          path: event._path,
          plugin,
          schema: event.schema,
          tags: event.tags,
        });
        break;
    }
  });

  // Conditionally emit resolveCondition helper only when referenced
  if (tracking.needsResolveCondition) {
    const conditionParamType = $.type.or($.type('boolean'), $.type('number'));
    const resolveConditionFn = $.func()
      .arrow()
      .param('condition', (p) => p.type(conditionParamType))
      .param('faker', (p) => p.type($.type(fakerTypeSymbol)))
      .returns('boolean')
      .do(
        $.return(
          $.binary(
            $('condition').eq($.literal(true)),
            '||',
            $(
              $.binary(
                $('condition').typeofExpr().eq($.literal('number')),
                '&&',
                $('faker')
                  .attr('datatype')
                  .attr('boolean')
                  .call($.object().prop('probability', $('condition'))),
              ),
            ),
          ),
        ),
      );
    const resolveConditionSymbol = plugin.symbol('resolveCondition');
    plugin.node($.const(resolveConditionSymbol).assign(resolveConditionFn), resolveConditionSlot);
  }
};
