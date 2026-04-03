import { buildSymbolIn, pathToName } from '@hey-api/shared';

import { $ } from '../../../../ts-dsl';
import type { ProcessorContext } from './processor';
import type { FakerResult } from './types';

export function exportAst({
  final,
  meta,
  naming,
  namingAnchor,
  path,
  plugin,
  schema,
  tags,
}: ProcessorContext & {
  final: FakerResult;
}): void {
  const name = pathToName(path, { anchor: namingAnchor });

  const symbol = plugin.registerSymbol(
    buildSymbolIn({
      meta: {
        category: 'schema',
        path,
        tags,
        tool: 'faker',
        ...meta,
      },
      name,
      naming,
      plugin,
      schema,
    }),
  );

  const fakerTypeSymbol = plugin.external('@faker-js/faker.Faker');

  // { faker?: Faker }
  const optionsType = $.type
    .object()
    .prop('faker', (p) => p.optional().type($.type(fakerTypeSymbol)));

  // Look up the TypeScript type for this schema (e.g. Foo, Bar)
  const typeSymbol = plugin.querySymbol({
    category: 'type',
    resource: 'definition',
    resourceId: meta.resourceId,
    tool: 'typescript',
  });

  // Build arrow function, only adding options param when the expression uses faker
  const arrowFn = $.func()
    .arrow()
    .$if(final.usesFaker, (f) => f.param('options', (p) => p.optional().type(optionsType)))
    .$if(typeSymbol, (f) => f.returns($.type(typeSymbol!)))
    .do($.return(final.expression));

  const statement = $.const(symbol).export().assign(arrowFn);

  plugin.node(statement);
}
