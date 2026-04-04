import type { IR, NamingConfig } from '@hey-api/shared';
import {
  buildSymbolIn,
  deduplicateSchema,
  operationResponsesMap,
  pathToName,
} from '@hey-api/shared';

import { $ } from '../../../../ts-dsl';
import type { FakerJsFakerPlugin } from '../types';
import type { ProcessorResult } from './processor';
import type { FakerResult } from './types';

type ResponseGroup = 'errors' | 'responses';

interface MeaningfulResponse {
  group: ResponseGroup;
  schema: IR.SchemaObject;
  statusCode: string;
}

function isVoidSchema(schema: IR.SchemaObject): boolean {
  return schema.type === 'void' || schema.type === 'never';
}

function collectMeaningfulResponses(
  responses: IR.SchemaObject | undefined,
  errors: IR.SchemaObject | undefined,
): ReadonlyArray<MeaningfulResponse> {
  const result: Array<MeaningfulResponse> = [];

  if (responses?.properties) {
    for (const [code, schema] of Object.entries(responses.properties)) {
      if (!isVoidSchema(schema)) {
        result.push({ group: 'responses', schema, statusCode: code });
      }
    }
  }

  if (errors?.properties) {
    for (const [code, schema] of Object.entries(errors.properties)) {
      if (!isVoidSchema(schema)) {
        result.push({ group: 'errors', schema, statusCode: code });
      }
    }
  }

  return result;
}

/**
 * Build a naming config with the status code appended to the template.
 *
 * For template `'fake{{name}}Response'` and status `'200'`,
 * produces `'fake{{name}}Response200'` which resolves to e.g. `fakeGetPetResponse200`.
 */
function suffixedNaming(naming: NamingConfig, statusCode: string): NamingConfig {
  return {
    ...naming,
    name:
      typeof naming.name === 'function'
        ? (n: string) => (naming.name as (n: string) => string)(n) + statusCode
        : (naming.name ?? '') + statusCode,
  };
}

/**
 * Export a per-status-code operation response factory.
 * Bypasses the standard `exportAst` pipeline to handle suffixed naming
 * and indexed access return types.
 */
function exportOperationResponse({
  group,
  naming,
  operation,
  path,
  plugin,
  processor,
  schema,
  statusCode,
  tags,
}: {
  group: ResponseGroup;
  naming: NamingConfig;
  operation: IR.OperationObject;
  path: ReadonlyArray<string | number>;
  plugin: FakerJsFakerPlugin['Instance'];
  processor: ProcessorResult;
  schema: IR.SchemaObject;
  statusCode: string;
  tags?: ReadonlyArray<string>;
}): void {
  // Process schema but don't export — we handle export manually
  const result = processor.process({
    export: false,
    meta: {
      resource: 'operation',
      resourceId: operation.id,
      role: group,
    },
    naming,
    namingAnchor: operation.id,
    path: [...path, group, statusCode],
    plugin,
    schema,
    tags,
  }) as FakerResult | void;

  if (!result) return;

  const name = pathToName([...path, 'responses'], { anchor: operation.id });

  const symbol = plugin.registerSymbol(
    buildSymbolIn({
      meta: {
        category: 'schema',
        path: [...path, group, statusCode],
        resource: 'operation',
        resourceId: operation.id,
        role: 'response',
        statusCode,
        tags,
        tool: 'faker',
      },
      name,
      naming: suffixedNaming(naming, statusCode),
      plugin,
      schema,
    }),
  );

  // Look up TypeScript type for indexed access return type
  // 2XX codes → responses (plural), 4XX/5XX → errors (plural)
  const typeSymbol = plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: group,
    tool: 'typescript',
  });

  // Use number literal for numeric codes (200), string literal for wildcards (2XX)
  const statusLiteral = /^\d+$/.test(statusCode)
    ? $.type.literal(Number(statusCode))
    : $.type.literal(statusCode);

  const arrowFn = $.func()
    .arrow()
    .$if(result.usesFaker, (f) => f.param('options', (p) => p.optional().type('Options')))
    .$if(typeSymbol, (f) => f.returns($.type(typeSymbol!).idx(statusLiteral)))
    .$if(
      result.usesAccessor,
      (f) => {
        const fakerPackagePath = plugin.config.locale
          ? `@faker-js/faker/locale/${plugin.config.locale}`
          : '@faker-js/faker';
        const fakerSymbol = plugin.external(`${fakerPackagePath}.faker`);
        const fDecl = $.const('f').assign(
          $.binary($('options').attr('faker').optional(), '??', $(fakerSymbol)),
        );
        return f.do(fDecl, $.return(result.expression));
      },
      (f) => f.do($.return(result.expression)),
    );

  plugin.node($.const(symbol).export().assign(arrowFn));
}

/**
 * Export an unsuffixed operation response factory (single meaningful 2XX, no errors).
 * Uses manual export with consistent metadata (role: 'response', statusCode).
 */
function exportUnsuffixedResponse({
  naming,
  operation,
  path,
  plugin,
  processor,
  schema,
  statusCode,
  tags,
}: {
  naming: NamingConfig;
  operation: IR.OperationObject;
  path: ReadonlyArray<string | number>;
  plugin: FakerJsFakerPlugin['Instance'];
  processor: ProcessorResult;
  schema: IR.SchemaObject;
  statusCode: string;
  tags?: ReadonlyArray<string>;
}): void {
  const result = processor.process({
    export: false,
    meta: {
      resource: 'operation',
      resourceId: operation.id,
      role: 'response',
    },
    naming,
    namingAnchor: operation.id,
    path: [...path, 'responses'],
    plugin,
    schema,
    tags,
  }) as FakerResult | void;

  if (!result) return;

  const name = pathToName([...path, 'responses'], { anchor: operation.id });

  const symbol = plugin.registerSymbol(
    buildSymbolIn({
      meta: {
        category: 'schema',
        path: [...path, 'responses'],
        resource: 'operation',
        resourceId: operation.id,
        role: 'response',
        statusCode,
        tags,
        tool: 'faker',
      },
      name,
      naming,
      plugin,
      schema,
    }),
  );

  // Look up TypeScript type (singular 'response' role)
  const typeSymbol = plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: 'response',
    tool: 'typescript',
  });

  const arrowFn = $.func()
    .arrow()
    .$if(result.usesFaker, (f) => f.param('options', (p) => p.optional().type('Options')))
    .$if(typeSymbol, (f) => f.returns($.type(typeSymbol!)))
    .$if(
      result.usesAccessor,
      (f) => {
        const fakerPackagePath = plugin.config.locale
          ? `@faker-js/faker/locale/${plugin.config.locale}`
          : '@faker-js/faker';
        const fakerSymbol = plugin.external(`${fakerPackagePath}.faker`);
        const fDecl = $.const('f').assign(
          $.binary($('options').attr('faker').optional(), '??', $(fakerSymbol)),
        );
        return f.do(fDecl, $.return(result.expression));
      },
      (f) => f.do($.return(result.expression)),
    );

  plugin.node($.const(symbol).export().assign(arrowFn));
}

function irParametersToIrSchema({
  parameters,
}: {
  parameters: Record<string, IR.ParameterObject>;
}): IR.SchemaObject {
  const irSchema: IR.SchemaObject = {
    type: 'object',
  };

  const properties: Record<string, IR.SchemaObject> = {};
  const required: Array<string> = [];

  for (const key in parameters) {
    const parameter = parameters[key]!;

    properties[parameter.name] = deduplicateSchema({
      detectFormat: false,
      schema: parameter.schema,
    });

    if (parameter.required) {
      required.push(parameter.name);
    }
  }

  irSchema.properties = properties;

  if (required.length) {
    irSchema.required = required;
  }

  return irSchema;
}

function isOctetStreamBody(body: IR.BodyObject): boolean {
  return body.type === 'octet-stream';
}

/**
 * Build and export a request data factory for an operation.
 * The factory produces an object matching the TypeScript data type shape:
 * `{ body?, path?, query?, headers?, url }`.
 */
export function irOperationRequestToAst({
  operation,
  path,
  plugin,
  processor,
  tags,
}: {
  operation: IR.OperationObject;
  path: ReadonlyArray<string | number>;
  plugin: FakerJsFakerPlugin['Instance'];
  processor: ProcessorResult;
  tags?: ReadonlyArray<string>;
}): void {
  if (!plugin.config.requests.enabled) return;

  const hasBody = operation.body && !isOctetStreamBody(operation.body);
  const hasParams =
    operation.parameters &&
    (operation.parameters.path ||
      operation.parameters.query ||
      operation.parameters.header ||
      operation.parameters.cookie);

  // Skip if operation has no parameters and no body
  if (!hasBody && !hasParams) return;

  // Build composite schema mirroring the TypeScript data type structure
  const properties: Record<string, IR.SchemaObject> = {};
  const required: Array<string> = [];

  if (hasBody) {
    properties.body = operation.body!.schema;
    if (operation.body!.required) {
      required.push('body');
    }
  }

  if (operation.parameters?.header) {
    properties.headers = irParametersToIrSchema({
      parameters: operation.parameters.header,
    });
    if (properties.headers.required) {
      required.push('headers');
    }
  }

  if (operation.parameters?.path) {
    properties.path = irParametersToIrSchema({
      parameters: operation.parameters.path,
    });
    if (properties.path.required) {
      required.push('path');
    }
  }

  if (operation.parameters?.query) {
    properties.query = irParametersToIrSchema({
      parameters: operation.parameters.query,
    });
    if (properties.query.required) {
      required.push('query');
    }
  }

  // Add url as a const string
  properties.url = {
    const: operation.path,
    type: 'string',
  };
  required.push('url');

  const compositeSchema: IR.SchemaObject = {
    properties,
    required,
    type: 'object',
  };

  const result = processor.process({
    export: false,
    meta: {
      resource: 'operation',
      resourceId: operation.id,
      role: 'request',
    },
    naming: plugin.config.requests,
    namingAnchor: operation.id,
    path: [...path, 'request'],
    plugin,
    schema: compositeSchema,
    tags,
  }) as FakerResult | void;

  if (!result) return;

  const name = pathToName([...path, 'request'], { anchor: operation.id });

  const symbol = plugin.registerSymbol(
    buildSymbolIn({
      meta: {
        category: 'schema',
        path: [...path, 'request'],
        resource: 'operation',
        resourceId: operation.id,
        role: 'request',
        tags,
        tool: 'faker',
      },
      name,
      naming: plugin.config.requests,
      plugin,
      schema: compositeSchema,
    }),
  );

  // Look up TypeScript data type for return type annotation
  const typeSymbol = plugin.querySymbol({
    category: 'type',
    resource: 'operation',
    resourceId: operation.id,
    role: 'data',
    tool: 'typescript',
  });

  const arrowFn = $.func()
    .arrow()
    .$if(result.usesFaker, (f) => f.param('options', (p) => p.optional().type('Options')))
    .$if(typeSymbol, (f) => f.returns($.type(typeSymbol!)))
    .$if(
      result.usesAccessor,
      (f) => {
        const fakerPackagePath = plugin.config.locale
          ? `@faker-js/faker/locale/${plugin.config.locale}`
          : '@faker-js/faker';
        const fakerSymbol = plugin.external(`${fakerPackagePath}.faker`);
        const fDecl = $.const('f').assign(
          $.binary($('options').attr('faker').optional(), '??', $(fakerSymbol)),
        );
        return f.do(fDecl, $.return(result.expression));
      },
      (f) => f.do($.return(result.expression)),
    );

  plugin.node($.const(symbol).export().assign(arrowFn));
}

export function irOperationToAst({
  operation,
  path,
  plugin,
  processor,
  tags,
}: {
  operation: IR.OperationObject;
  path: ReadonlyArray<string | number>;
  plugin: FakerJsFakerPlugin['Instance'];
  processor: ProcessorResult;
  tags?: ReadonlyArray<string>;
}): void {
  if (!plugin.config.responses.enabled || !operation.responses) return;

  const { errors, responses } = operationResponsesMap(operation);

  const meaningful = collectMeaningfulResponses(responses, errors);
  if (meaningful.length === 0) return;

  // No suffix only when: exactly 1 useful 2XX response and no useful error responses
  const useSuffix = !(meaningful.length === 1 && meaningful[0]!.group === 'responses');

  if (!useSuffix) {
    const entry = meaningful[0]!;
    exportUnsuffixedResponse({
      naming: plugin.config.responses,
      operation,
      path,
      plugin,
      processor,
      schema: entry.schema,
      statusCode: entry.statusCode,
      tags,
    });
  } else {
    for (const entry of meaningful) {
      exportOperationResponse({
        group: entry.group,
        naming: plugin.config.responses,
        operation,
        path,
        plugin,
        processor,
        schema: entry.schema,
        statusCode: entry.statusCode,
        tags,
      });
    }
  }
}
