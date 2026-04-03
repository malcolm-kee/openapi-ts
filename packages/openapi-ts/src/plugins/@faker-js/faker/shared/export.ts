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

  // Look up the TypeScript type for this schema (e.g. Foo, Bar, or PostFooResponse)
  const typeSymbol = plugin.querySymbol({
    category: 'type',
    resource: meta.resource,
    resourceId: meta.resourceId,
    tool: 'typescript',
    ...(meta.role ? { role: meta.role } : undefined),
  });

  // Build arrow function, only adding options param when the expression uses faker.
  // When usesAccessor is true, emit a block body: const f = options?.faker ?? faker; return <expr>;
  const arrowFn = $.func()
    .arrow()
    .$if(final.usesFaker, (f) => f.param('options', (p) => p.optional().type('Options')))
    .$if(typeSymbol, (f) => f.returns($.type(typeSymbol!)))
    .$if(
      final.usesAccessor,
      (f) => {
        const fakerPackagePath = plugin.config.locale
          ? `@faker-js/faker/locale/${plugin.config.locale}`
          : '@faker-js/faker';
        const fakerSymbol = plugin.external(`${fakerPackagePath}.faker`);
        const fDecl = $.const('f').assign(
          $.binary($('options').attr('faker').optional(), '??', $(fakerSymbol)),
        );
        return f.do(fDecl, $.return(final.expression));
      },
      (f) => f.do($.return(final.expression)),
    );

  const statement = $.const(symbol).export().assign(arrowFn);

  plugin.node(statement);
}
