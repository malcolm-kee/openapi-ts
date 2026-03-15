import { parseUrl } from '@hey-api/shared';

import { $ } from '../../ts-dsl';
import { operationToHandlerCreator } from './handlerCreator';
import type { MswPlugin } from './types';

export const handler: MswPlugin['Handler'] = ({ plugin }) => {
  // Register external MSW symbols
  plugin.symbol('http', {
    external: 'msw',
    meta: {
      category: 'external',
      resource: 'msw.http',
      tool: 'msw',
    },
  });

  plugin.symbol('HttpHandler', {
    external: 'msw',
    kind: 'type',
    meta: {
      category: 'external',
      resource: 'msw.HttpHandler',
      tool: 'msw',
    },
  });

  const symbolHttpResponse = plugin.symbol('HttpResponse', {
    external: 'msw',
    meta: {
      category: 'external',
      resource: 'msw.HttpResponse',
      tool: 'msw',
    },
  });

  plugin.symbol('HttpResponseResolver', {
    external: 'msw',
    kind: 'type',
    meta: {
      category: 'external',
      resource: 'msw.HttpResponseResolver',
      tool: 'msw',
    },
  });

  plugin.symbol('RequestHandlerOptions', {
    external: 'msw',
    kind: 'type',
    meta: {
      category: 'external',
      resource: 'msw.RequestHandlerOptions',
      tool: 'msw',
    },
  });

  // Generate StringifyPathParams utility type (only emitted if needed)
  // type StringifyPathParams<T> = { [K in keyof T]: string | readonly string[] }
  const symbolStringifyPathParams = plugin.symbol('StringifyPathParams', {
    meta: {
      category: 'type',
      resource: 'stringify-path-params',
    },
  });
  let stringifyPathParamsEmitted = false;
  const emitStringifyPathParams = () => {
    if (stringifyPathParamsEmitted) {
      return;
    }
    stringifyPathParamsEmitted = true;
    const stringifyPathParamsType = $.type
      .alias(symbolStringifyPathParams)
      .generic('T')
      .type(
        $.type
          .mapped('K')
          .key($.type('keyof T'))
          .required()
          .type(
            $.type.or(
              $.type('string'),
              $.type('ReadonlyArray', (t) => t.generic($.type('string'))),
            ),
          ),
      );
    plugin.node(stringifyPathParamsType);
  };

  // Generate ToResponseUnion utility type (only emitted if needed)
  // type ToResponseUnion<T> = { [K in keyof T]: { statusCode: K; result: T[K] } }[keyof T]
  const symbolToResponseUnion = plugin.symbol('ToResponseUnion', {
    meta: {
      category: 'type',
      resource: 'to-response-union',
    },
  });
  let toResponseUnionEmitted = false;
  const emitToResponseUnion = () => {
    if (toResponseUnionEmitted) {
      return;
    }
    toResponseUnionEmitted = true;
    // type ToResponseUnion<T> = {
    //     [K in Extract<keyof T, number>]: {
    //         status: K;
    //         result: T[K];
    //     };
    // }[Extract<keyof T, number>];
    const extractKeyofTNumber = $.type('Extract', (t) =>
      t.generic($.type('keyof T')).generic($.type('number')),
    );
    const toResponseUnionType = $.type
      .alias(symbolToResponseUnion)
      .generic('T')
      .type(
        $.type.idx(
          $.type
            .mapped('K')
            .key(extractKeyofTNumber)
            .type(
              $.type
                .object()
                .prop('status', (p) => p.type('K'))
                .prop('result', (p) => p.type($.type.idx($.type('T'), $.type('K')))),
            ),
          $.type('Extract', (t) => t.generic($.type('keyof T')).generic($.type('number'))),
        ),
      );
    plugin.node(toResponseUnionType);
  };

  // Generate toMswPath helper
  // const toMswPath = (path: string, baseUrl: string) => `${baseUrl}${path.replace(/\{([^}]+)\}/g, ':$1')}`
  const symbolToMswPath = plugin.symbol('toMswPath', {
    meta: {
      category: 'function',
      resource: 'to-msw-path',
    },
  });
  const toMswPathFn = $.const(symbolToMswPath).assign(
    $.func((f) =>
      f
        .param('path', (p) => p.type('string'))
        .param('baseUrl', (p) => p.type('string'))
        .do(
          $.return(
            $.template($('baseUrl')).add(
              $('path').attr('replace').call($.regexp('\\{([^}]+)\\}', 'g'), $.literal(':$1')),
            ),
          ),
        ),
    ),
  );
  plugin.node(toMswPathFn);

  // Generate resolveToNull helper
  // const resolveToNull = () => new HttpResponse(null)
  const symbolResolveToNull = plugin.symbol('resolveToNull', {
    meta: {
      category: 'function',
      resource: 'resolve-to-null',
    },
  });
  const resolveToNullFn = $.const(symbolResolveToNull).assign(
    $.func((f) => f.do($.new(symbolHttpResponse, $.literal(null)).return())),
  );
  plugin.node(resolveToNullFn);

  // Resolve default baseUrl from spec servers
  let defaultBaseUrl = '';
  const { servers } = plugin.context.ir;
  const firstServer = servers?.[0];
  if (firstServer) {
    const serverUrl = firstServer.url;
    const url = parseUrl(serverUrl);
    if (url.protocol && url.host && !serverUrl.includes('{')) {
      defaultBaseUrl = serverUrl;
    } else if (serverUrl !== '/' && serverUrl.startsWith('/')) {
      defaultBaseUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
    }
  }

  // Generate createMswHandlerFactory
  const symbolFactory = plugin.symbol('createMswHandlerFactory');
  const ofObject = $.object().pretty();
  const singleHandlerFactoriesType = $.type.object();

  plugin.forEach(
    'operation',
    ({ operation }) => {
      const handlerCreator = operationToHandlerCreator({
        emitStringifyPathParams,
        emitToResponseUnion,
        examples: plugin.config.valueSources?.includes('example') ?? true,
        operation,
        plugin,
      });
      if (handlerCreator) {
        ofObject.prop(handlerCreator.name, handlerCreator.value);
        singleHandlerFactoriesType.prop(handlerCreator.name, (p) => p.type(handlerCreator.type));
      }
    },
    {
      order: 'declarations',
    },
  );

  // Emit MswHandlerFactory type
  const symbolSingleHandlerFactories = plugin.symbol('SingleHandlerFactories');
  plugin.node($.type.alias(symbolSingleHandlerFactories).export().type(singleHandlerFactoriesType));

  const symbolMswHandlerFactory = plugin.symbol('MswHandlerFactory');
  const mswHandlerFactoryType = $.type
    .alias(symbolMswHandlerFactory)
    .export()
    .type($.type.object().prop('of', (p) => p.type(symbolSingleHandlerFactories)));
  plugin.node(mswHandlerFactoryType);

  const factoryFn = $.const(symbolFactory)
    .export()
    .assign(
      $.func((f) =>
        f
          .param('config', (p) =>
            p
              .required(false)
              .type($.type.object().prop('baseUrl', (p) => p.required(false).type('string'))),
          )
          .returns($.type(symbolMswHandlerFactory))
          .do(
            $.const('baseUrl').assign(
              $.binary($.attr($('config'), 'baseUrl').optional(), '??', $.literal(defaultBaseUrl)),
            ),
            $.const('of').type('SingleHandlerFactories').assign(ofObject),
            $.return($.object().prop('of', 'of')),
          ),
      ),
    );
  plugin.node(factoryFn);
};
