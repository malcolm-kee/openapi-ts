import { pathToJsonPointer } from '@hey-api/shared';

import { $ } from '../../../../ts-dsl';
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
        .optional()
        .type($.type.or($.type.literal('always'), $.type.literal('random'), $.type.literal(false))),
    )
    .prop('useDefault', (p) =>
      p
        .optional()
        .type($.type.or($.type.literal('always'), $.type.literal('random'), $.type.literal(false))),
    );
  plugin.node($.type.alias(optionsSymbol).export().type(optionsType));

  // Emit helper: const resolveCondition = (condition: 'always' | 'random' | false, faker: Faker): boolean =>
  //   condition === 'always' || condition === 'random' && faker.datatype.boolean()
  const conditionParamType = $.type.or(
    $.type.literal('always'),
    $.type.literal('random'),
    $.type.literal(false),
  );
  const resolveConditionFn = $.func()
    .arrow()
    .param('condition', (p) => p.type(conditionParamType))
    .param('faker', (p) => p.type($.type(fakerTypeSymbol)))
    .returns('boolean')
    .do(
      $.return(
        $.binary(
          $('condition').eq($.literal('always')),
          '||',
          $(
            $.binary(
              $('condition').eq($.literal('random')),
              '&&',
              $('faker').attr('datatype').attr('boolean').call(),
            ),
          ),
        ),
      ),
    );
  const resolveConditionSymbol = plugin.symbol('resolveCondition');
  plugin.node($.const(resolveConditionSymbol).assign(resolveConditionFn));

  // Emit helper: const ensureFaker = (options?: Options): Faker => options?.faker ?? faker
  const fakerSymbol = plugin.external('@faker-js/faker.faker');
  const ensureFakerFn = $.func()
    .arrow()
    .param('options', (p) => p.optional().type('Options'))
    .returns($.type(fakerTypeSymbol))
    .do($.return($.binary($('options').attr('faker').optional(), '??', $(fakerSymbol))));
  const ensureFakerSymbol = plugin.symbol('ensureFaker');
  plugin.node($.const(ensureFakerSymbol).assign(ensureFakerFn));

  const processor = createProcessor(plugin);

  plugin.forEach('parameter', 'requestBody', 'schema', (event) => {
    switch (event.type) {
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
};
