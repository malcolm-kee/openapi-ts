import type { IR } from '@hey-api/shared';

import { $ } from '../../ts-dsl';
import { computeDominantResponse, type DominantResponse } from './computeDominantResponse';
import type { MswPlugin } from './types';

const httpMethodMap: Record<string, string> = {
  delete: 'delete',
  get: 'get',
  head: 'head',
  options: 'options',
  patch: 'patch',
  post: 'post',
  put: 'put',
  trace: 'trace',
};

/**
 * Builds the response override expression for the `res` parameter.
 * When `res` is an object with a `status` property, it uses
 * `res.result` as the value and `res.status` as the status code.
 */
const buildResponseOverrideExpr = ({
  dominantResponse: { kind: responseKind },
  responseOrFnName,
  symbolHttpResponse,
}: {
  dominantResponse: DominantResponse;
  responseOrFnName: string;
  symbolHttpResponse: ReturnType<MswPlugin['Instance']['external']>;
}) => {
  const statusOption = $.object().prop('status', $.attr(responseOrFnName, 'status'));
  const resultExpr = $.attr(responseOrFnName, 'result');

  switch (responseKind) {
    case 'void': {
      return $.func((f) =>
        f.do(
          $.new(
            symbolHttpResponse,
            $.binary(resultExpr, '??', $.literal(null)),
            statusOption,
          ).return(),
        ),
      );
    }
    case 'json': {
      return $.func((f) =>
        f.do(
          $(symbolHttpResponse)
            .attr('json')
            .call($.binary(resultExpr, '??', $.literal(null)), statusOption)
            .return(),
        ),
      );
    }
    case 'text': {
      return $.func((f) =>
        f.do(
          $(symbolHttpResponse)
            .attr('text')
            .call($.as(resultExpr, $.type('any')), statusOption)
            .return(),
        ),
      );
    }
    case 'binary': {
      return $.func((f) =>
        f.do($.new(symbolHttpResponse, $.as(resultExpr, $.type('any')), statusOption).return()),
      );
    }
  }
};

/**
 * Builds an arrow function that creates an MSW handler for a single operation.
 * The response method and status code are inferred from the operation's responses.
 */
const createHandlerCreatorFn = ({
  dominantResponse,
  hasResponseOverride,
  method,
  operation,
  symbolHttp,
  symbolHttpResponse,
  symbolResolveToNull,
  symbolToMswPath,
}: {
  dominantResponse: DominantResponse;
  hasResponseOverride: boolean;
  method: string;
  operation: IR.OperationObject;
  symbolHttp: ReturnType<MswPlugin['Instance']['external']>;
  symbolHttpResponse: ReturnType<MswPlugin['Instance']['external']>;
  symbolResolveToNull: ReturnType<MswPlugin['Instance']['referenceSymbol']>;
  symbolToMswPath: ReturnType<MswPlugin['Instance']['referenceSymbol']>;
}) => {
  const responseOrFnName = 'res';
  const optionsName = 'options';

  const fallbackTernary = $.ternary(
    $.binary($.typeofExpr(responseOrFnName), '===', $.literal('function')),
  )
    .do(responseOrFnName)
    .otherwise($(symbolResolveToNull));

  const resolverArg = hasResponseOverride
    ? $.ternary(
        $.binary(
          $.binary($.typeofExpr(responseOrFnName), '===', $.literal('object')),
          '&&',
          $.attr(responseOrFnName, 'status'),
        ),
      )
        .do(
          buildResponseOverrideExpr({
            dominantResponse,
            responseOrFnName,
            symbolHttpResponse,
          }),
        )
        .otherwise(fallbackTernary)
    : fallbackTernary;

  const httpCall = $(symbolHttp)
    .attr(method)
    .call($.call(symbolToMswPath, $.literal(operation.path), 'baseUrl'), resolverArg, optionsName);

  return $.func((f) => {
    if (dominantResponse.example != null && dominantResponse.statusCode != null) {
      const status = dominantResponse.statusCode;
      const example = dominantResponse.example;
      f.param(responseOrFnName, (p) => p.assign($.fromValue({ result: example, status })));
    } else {
      f.param(responseOrFnName);
    }
    f.param(optionsName);
    f.do(httpCall.return());
  });
};

export const operationToHandlerCreator = ({
  emitStringifyPathParams,
  emitToResponseUnion,
  examples,
  operation,
  plugin,
}: {
  emitStringifyPathParams: () => void;
  emitToResponseUnion: () => void;
  examples: boolean;
  operation: IR.OperationObject;
  plugin: MswPlugin['Instance'];
}) => {
  const method = httpMethodMap[operation.method];
  if (!method) {
    return;
  }

  const symbolHttp = plugin.external('msw.http');
  const symbolHttpHandler = plugin.external('msw.HttpHandler');
  const symbolHttpResponse = plugin.external('msw.HttpResponse');
  const symbolHttpResponseResolver = plugin.external('msw.HttpResponseResolver');
  const symbolRequestHandlerOptions = plugin.external('msw.RequestHandlerOptions');
  const symbolStringifyPathParams = plugin.referenceSymbol({
    category: 'type',
    resource: 'stringify-path-params',
  });
  const symbolToResponseUnion = plugin.referenceSymbol({
    category: 'type',
    resource: 'to-response-union',
  });
  const symbolToMswPath = plugin.referenceSymbol({
    category: 'function',
    resource: 'to-msw-path',
  });
  const symbolResolveToNull = plugin.referenceSymbol({
    category: 'function',
    resource: 'resolve-to-null',
  });

  // Query response type from @hey-api/typescript
  const symbolResponsesType = plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: 'responses',
  });
  let responsesOverrideType: ReturnType<typeof $.type> | undefined;
  if (symbolResponsesType) {
    emitToResponseUnion();
    responsesOverrideType = $.type(symbolToResponseUnion, (t) => t.generic(symbolResponsesType));
  }

  // Query data type for parameters
  const symbolDataType = plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: 'data',
    tool: 'typescript',
  });

  // Build HttpResponseResolver generics
  const hasPathParams =
    operation.parameters?.path && Object.keys(operation.parameters.path).length > 0;
  const hasBody = !!operation.body;

  let pathParamsType: ReturnType<typeof $.type> | undefined;
  if (hasPathParams && symbolDataType) {
    emitStringifyPathParams();
    pathParamsType = $.type(symbolStringifyPathParams, (t) =>
      t.generic(
        $.type('NonNullable', (t) =>
          t.generic($.type.idx($.type(symbolDataType), $.type.literal('path'))),
        ),
      ),
    );
  }

  let bodyType: ReturnType<typeof $.type.idx> | ReturnType<typeof $.type> | undefined;
  if (hasBody && symbolDataType) {
    bodyType = $.type.idx($.type(symbolDataType), $.type.literal('body'));
  }

  // Build the resolver type: HttpResponseResolver<Params, Body>
  // Omit response type generic to avoid MSW's DefaultBodyType constraint issues
  const hasResolverGenerics = pathParamsType || bodyType;
  const resolverType = hasResolverGenerics
    ? $.type(symbolHttpResponseResolver, (t) =>
        t.generics(pathParamsType ?? $.type('never'), bodyType ?? $.type('never')),
      )
    : $.type(symbolHttpResponseResolver);

  const dominantResponse = computeDominantResponse({ operation, plugin });

  // When examples are disabled, strip the example from the dominant response
  if (!examples) {
    dominantResponse.example = undefined;
  }

  const handlerCreator = createHandlerCreatorFn({
    dominantResponse,
    hasResponseOverride: dominantResponse.statusCode != null,
    method,
    operation,
    symbolHttp,
    symbolHttpResponse,
    symbolResolveToNull,
    symbolToMswPath,
  });

  const handlerType = $.type
    .func()
    .param('responseOrResolver', (p) =>
      // if there is no dominantResponse, it means there is no status code definition
      // so we can set the default response as null
      dominantResponse.statusCode != null && responsesOverrideType
        ? // if there is example, the param is optional because example can be used
          // if it's void, the param is optional because we can define the default (`null`)
          dominantResponse.example != null || dominantResponse.kind === 'void'
          ? p.type($.type.or(responsesOverrideType, resolverType)).optional()
          : p.type($.type.or(responsesOverrideType, resolverType))
        : p.type(resolverType).optional(),
    )
    .param('options', (p) => p.type($.type(symbolRequestHandlerOptions)).optional())
    .returns($.type(symbolHttpHandler));

  return {
    name: operation.id,
    type: handlerType,
    value: handlerCreator,
  };
};
