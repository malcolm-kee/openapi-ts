import type { Context, OpenApi } from '@hey-api/shared';
import { satisfies } from '@hey-api/shared';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from '@hey-api/spec-types';

import { $ } from '../../../ts-dsl';
import { safeRuntimeName } from '../../../ts-dsl/utils/name';
import type { HeyApiSchemasPlugin } from './types';

const stripSchema = ({
  plugin,
  schema,
}: {
  plugin: HeyApiSchemasPlugin['Instance'];
  schema: OpenAPIV2.SchemaObject | OpenAPIV3.SchemaObject | OpenAPIV3_1.SchemaObject;
}) => {
  if (plugin.config.type === 'form') {
    if (schema.description) {
      delete schema.description;
    }

    if (schema['x-enum-descriptions']) {
      delete schema['x-enum-descriptions'];
    }

    if (schema['x-enum-varnames']) {
      delete schema['x-enum-varnames'];
    }

    if (schema['x-enumNames']) {
      delete schema['x-enumNames'];
    }

    if (schema.title) {
      delete schema.title;
    }
  }
};

const schemaToJsonSchemaDraft_04 = ({
  context,
  plugin,
  schema: _schema,
}: {
  context: Context;
  plugin: HeyApiSchemasPlugin['Instance'];
  schema: OpenAPIV2.SchemaObject;
}): OpenAPIV2.SchemaObject => {
  if (Array.isArray(_schema)) {
    return _schema.map((item) =>
      schemaToJsonSchemaDraft_04({
        context,
        plugin,
        schema: item,
      }),
    ) as unknown as OpenAPIV2.SchemaObject;
  }

  const schema = structuredClone(_schema);

  if (schema.$ref) {
    // refs using unicode characters become encoded, didn't investigate why
    // but the suspicion is this comes from `@hey-api/json-schema-ref-parser`
    schema.$ref = decodeURI(schema.$ref);
    return schema;
  }

  stripSchema({ plugin, schema });

  if (schema.additionalProperties && typeof schema.additionalProperties !== 'boolean') {
    schema.additionalProperties = schemaToJsonSchemaDraft_04({
      context,
      plugin,
      schema: schema.additionalProperties,
    });
  }

  if (schema.allOf) {
    schema.allOf = schema.allOf.map((item) =>
      schemaToJsonSchemaDraft_04({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.items) {
    schema.items = schemaToJsonSchemaDraft_04({
      context,
      plugin,
      schema: schema.items as OpenAPIV2.SchemaObject,
    });
  }

  if (schema.properties) {
    for (const name in schema.properties) {
      const property = schema.properties[name]!;

      if (typeof property !== 'boolean') {
        schema.properties[name] = schemaToJsonSchemaDraft_04({
          context,
          plugin,
          schema: property,
        });
      }
    }
  }

  return schema;
};

const schemaToJsonSchemaDraft_05 = ({
  context,
  plugin,
  schema: _schema,
}: {
  context: Context;
  plugin: HeyApiSchemasPlugin['Instance'];
  schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
}): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject => {
  if (Array.isArray(_schema)) {
    return _schema.map((item) =>
      schemaToJsonSchemaDraft_05({
        context,
        plugin,
        schema: item,
      }),
    ) as unknown as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
  }

  const schema = structuredClone(_schema);

  if ('$ref' in schema) {
    // refs using unicode characters become encoded, didn't investigate why
    // but the suspicion is this comes from `@hey-api/json-schema-ref-parser`
    schema.$ref = decodeURI(schema.$ref);
    return schema;
  }

  stripSchema({ plugin, schema });

  if (schema.additionalProperties && typeof schema.additionalProperties !== 'boolean') {
    schema.additionalProperties = schemaToJsonSchemaDraft_05({
      context,
      plugin,
      schema: schema.additionalProperties,
    });
  }

  if (schema.allOf) {
    schema.allOf = schema.allOf.map((item) =>
      schemaToJsonSchemaDraft_05({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map((item) =>
      schemaToJsonSchemaDraft_05({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.items) {
    schema.items = schemaToJsonSchemaDraft_05({
      context,
      plugin,
      schema: schema.items,
    });
  }

  if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map((item) =>
      schemaToJsonSchemaDraft_05({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.properties) {
    for (const name in schema.properties) {
      const property = schema.properties[name]!;

      if (typeof property !== 'boolean') {
        schema.properties[name] = schemaToJsonSchemaDraft_05({
          context,
          plugin,
          schema: property,
        });
      }
    }
  }

  return schema;
};

const schemaToJsonSchema2020_12 = ({
  context,
  plugin,
  schema: _schema,
}: {
  context: Context;
  plugin: HeyApiSchemasPlugin['Instance'];
  schema: OpenAPIV3_1.SchemaObject;
}): OpenAPIV3_1.SchemaObject => {
  if (Array.isArray(_schema)) {
    return _schema.map((item) =>
      schemaToJsonSchema2020_12({
        context,
        plugin,
        schema: item,
      }),
    ) as unknown as OpenAPIV3_1.SchemaObject;
  }

  const schema = structuredClone(_schema);

  stripSchema({ plugin, schema });

  if (schema.$ref) {
    // refs using unicode characters become encoded, didn't investigate why
    // but the suspicion is this comes from `@hey-api/json-schema-ref-parser`
    schema.$ref = decodeURI(schema.$ref);
  }

  if (schema.additionalProperties && typeof schema.additionalProperties !== 'boolean') {
    schema.additionalProperties = schemaToJsonSchema2020_12({
      context,
      plugin,
      schema: schema.additionalProperties,
    });
  }

  if (schema.allOf) {
    schema.allOf = schema.allOf.map((item) =>
      schemaToJsonSchema2020_12({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.anyOf) {
    schema.anyOf = schema.anyOf.map((item) =>
      schemaToJsonSchema2020_12({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.items) {
    schema.items = schemaToJsonSchema2020_12({
      context,
      plugin,
      schema: schema.items,
    });
  }

  if (schema.oneOf) {
    schema.oneOf = schema.oneOf.map((item) =>
      schemaToJsonSchema2020_12({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.prefixItems) {
    schema.prefixItems = schema.prefixItems.map((item) =>
      schemaToJsonSchema2020_12({
        context,
        plugin,
        schema: item,
      }),
    );
  }

  if (schema.properties) {
    for (const name in schema.properties) {
      const property = schema.properties[name]!;

      if (typeof property !== 'boolean') {
        schema.properties[name] = schemaToJsonSchema2020_12({
          context,
          plugin,
          schema: property,
        });
      }
    }
  }

  return schema;
};

const httpMethods = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'] as const;

const httpMethodsV2 = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put'] as const;

const schemaName = ({
  name,
  plugin,
  schema,
}: {
  name: string;
  plugin: HeyApiSchemasPlugin['Instance'];
  schema:
    | OpenAPIV2.SchemaObject
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.SchemaObject
    | OpenAPIV3_1.SchemaObject;
}): string => {
  let customName = '';

  if (plugin.config.nameBuilder) {
    if (typeof plugin.config.nameBuilder === 'function') {
      customName = plugin.config.nameBuilder(name, schema);
    } else {
      customName = plugin.config.nameBuilder.replace('{{name}}', name);
    }
  }

  if (!customName) {
    customName = `${name}Schema`;
  }

  return customName;
};

const resolveRequestsConfig = (
  plugin: HeyApiSchemasPlugin['Instance'],
): {
  enabled: boolean;
  nameBuilder: NonNullable<
    NonNullable<
      Exclude<HeyApiSchemasPlugin['Instance']['config']['requests'], boolean>
    >['nameBuilder']
  >;
} => {
  const requests = plugin.config.requests;
  if (requests === false || requests === undefined) {
    return { enabled: false, nameBuilder: (name) => `${name}RequestSchema` };
  }
  if (requests === true) {
    return { enabled: true, nameBuilder: (name) => `${name}RequestSchema` };
  }
  const enabled = requests.enabled !== false;
  let nameBuilder = requests.nameBuilder;
  if (!nameBuilder) {
    nameBuilder = (name) => `${name}RequestSchema`;
  }
  return { enabled, nameBuilder };
};

const requestSchemaName = ({
  method,
  nameBuilder,
  operationId,
  path,
  schema,
}: {
  method: string;
  nameBuilder:
    | string
    | ((
        name: string,
        schema:
          | OpenAPIV2.SchemaObject
          | OpenAPIV3.ReferenceObject
          | OpenAPIV3.SchemaObject
          | OpenAPIV3_1.SchemaObject,
      ) => string);
  operationId: string | undefined;
  path: string;
  schema:
    | OpenAPIV2.SchemaObject
    | OpenAPIV3.ReferenceObject
    | OpenAPIV3.SchemaObject
    | OpenAPIV3_1.SchemaObject;
}): string => {
  // Derive a base name from operationId or method+path
  let baseName: string;
  if (operationId) {
    baseName = safeRuntimeName(operationId);
  } else {
    // Convert /api/v{version}/users/{id} + post -> PostApiVVersionUsersId
    const pathPart = path
      .split('/')
      .filter(Boolean)
      .map((segment) => {
        const cleaned = segment.replace(/[{}$+]/g, '');
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      })
      .join('');
    baseName = safeRuntimeName(method.charAt(0).toUpperCase() + method.slice(1) + pathPart);
  }

  if (typeof nameBuilder === 'function') {
    return nameBuilder(baseName, schema);
  }
  return nameBuilder.replace('{{name}}', baseName);
};

const schemasV2_0_X = ({
  context,
  plugin,
}: {
  context: Context<OpenApi.V2_0_X>;
  plugin: HeyApiSchemasPlugin['Instance'];
}) => {
  if (!context.spec.definitions) {
    return;
  }

  for (const name in context.spec.definitions) {
    const schema = context.spec.definitions[name]!;
    const symbol = plugin.symbol(schemaName({ name, plugin, schema }), {
      meta: {
        category: 'schema',
        resource: 'definition',
        resourceId: name,
        tool: 'json-schema',
      },
    });
    const obj = schemaToJsonSchemaDraft_04({
      context,
      plugin,
      schema,
    });
    const statement = $.const(symbol)
      .export()
      .assign(
        $(
          $.fromValue(obj, {
            layout: 'pretty',
          }),
        ).as('const'),
      );
    plugin.node(statement);
  }
};

const schemasV3_0_X = ({
  context,
  plugin,
}: {
  context: Context<OpenApi.V3_0_X>;
  plugin: HeyApiSchemasPlugin['Instance'];
}) => {
  if (!context.spec.components) {
    return;
  }

  for (const name in context.spec.components.schemas) {
    const schema = context.spec.components.schemas[name]!;
    const symbol = plugin.symbol(schemaName({ name, plugin, schema }), {
      meta: {
        category: 'schema',
        resource: 'definition',
        resourceId: name,
        tool: 'json-schema',
      },
    });
    const obj = schemaToJsonSchemaDraft_05({
      context,
      plugin,
      schema,
    });
    const statement = $.const(symbol)
      .export()
      .assign(
        $(
          $.fromValue(obj, {
            layout: 'pretty',
          }),
        ).as('const'),
      );
    plugin.node(statement);
  }
};

const schemasV3_1_X = ({
  context,
  plugin,
}: {
  context: Context<OpenApi.V3_1_X>;
  plugin: HeyApiSchemasPlugin['Instance'];
}) => {
  if (!context.spec.components) {
    return;
  }

  for (const name in context.spec.components.schemas) {
    const schema = context.spec.components.schemas[name]!;
    const symbol = plugin.symbol(schemaName({ name, plugin, schema }), {
      meta: {
        category: 'schema',
        resource: 'definition',
        resourceId: name,
        tool: 'json-schema',
      },
    });
    const obj = schemaToJsonSchema2020_12({
      context,
      plugin,
      schema,
    });
    const statement = $.const(symbol)
      .export()
      .assign(
        $(
          $.fromValue(obj, {
            layout: 'pretty',
          }),
        ).as('const'),
      );
    plugin.node(statement);
  }
};

const requestSchemasV2_0_X = ({
  context,
  plugin,
}: {
  context: Context<OpenApi.V2_0_X>;
  plugin: HeyApiSchemasPlugin['Instance'];
}) => {
  const config = resolveRequestsConfig(plugin);
  if (!config.enabled || !context.spec.paths) {
    return;
  }

  for (const path in context.spec.paths) {
    const pathItem = context.spec.paths[path as `/${string}`];
    if (!pathItem) {
      continue;
    }

    for (const method of httpMethodsV2) {
      const operation = pathItem[method];
      if (!operation?.parameters) {
        continue;
      }

      // In OpenAPI 2.0, request body is a parameter with in: 'body'
      for (const param of operation.parameters) {
        if ('$ref' in param || param.in !== 'body' || !('schema' in param)) {
          continue;
        }

        const name = requestSchemaName({
          method,
          nameBuilder: config.nameBuilder,
          operationId: operation.operationId,
          path,
          schema: param.schema,
        });
        const symbol = plugin.symbol(name, {
          meta: {
            category: 'schema',
            resource: 'request',
            resourceId: operation.operationId ?? `${method}:${path}`,
            tool: 'json-schema',
          },
        });
        const obj = schemaToJsonSchemaDraft_04({
          context,
          plugin,
          schema: param.schema,
        });
        const statement = $.const(symbol)
          .export()
          .assign(
            $(
              $.fromValue(obj, {
                layout: 'pretty',
              }),
            ).as('const'),
          );
        plugin.node(statement);
        break; // Only one body parameter is allowed
      }
    }
  }
};

const requestSchemasV3_0_X = ({
  context,
  plugin,
}: {
  context: Context<OpenApi.V3_0_X>;
  plugin: HeyApiSchemasPlugin['Instance'];
}) => {
  const config = resolveRequestsConfig(plugin);
  if (!config.enabled || !context.spec.paths) {
    return;
  }

  for (const path in context.spec.paths) {
    const pathItem = context.spec.paths[path as `/${string}`];
    if (!pathItem) {
      continue;
    }

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation?.requestBody) {
        continue;
      }

      const requestBody = operation.requestBody;
      // Skip $ref request bodies
      if ('$ref' in requestBody) {
        continue;
      }

      // Prefer application/json, fall back to first available content type
      const mediaType =
        requestBody.content['application/json'] ?? Object.values(requestBody.content)[0];
      if (!mediaType?.schema) {
        continue;
      }

      const schema = mediaType.schema;
      const name = requestSchemaName({
        method,
        nameBuilder: config.nameBuilder,
        operationId: operation.operationId,
        path,
        schema,
      });
      const symbol = plugin.symbol(name, {
        meta: {
          category: 'schema',
          resource: 'request',
          resourceId: operation.operationId ?? `${method}:${path}`,
          tool: 'json-schema',
        },
      });
      const obj = schemaToJsonSchemaDraft_05({
        context,
        plugin,
        schema,
      });
      const statement = $.const(symbol)
        .export()
        .assign(
          $(
            $.fromValue(obj, {
              layout: 'pretty',
            }),
          ).as('const'),
        );
      plugin.node(statement);
    }
  }
};

const requestSchemasV3_1_X = ({
  context,
  plugin,
}: {
  context: Context<OpenApi.V3_1_X>;
  plugin: HeyApiSchemasPlugin['Instance'];
}) => {
  const config = resolveRequestsConfig(plugin);
  if (!config.enabled || !context.spec.paths) {
    return;
  }

  for (const path in context.spec.paths) {
    const pathItem = context.spec.paths[path as `/${string}`];
    if (!pathItem) {
      continue;
    }

    for (const method of httpMethods) {
      const operation = pathItem[method];
      if (!operation?.requestBody) {
        continue;
      }

      const requestBody = operation.requestBody;
      // Skip $ref request bodies
      if ('$ref' in requestBody) {
        continue;
      }

      // Prefer application/json, fall back to first available content type
      const mediaType =
        requestBody.content['application/json'] ?? Object.values(requestBody.content)[0];
      if (!mediaType?.schema) {
        continue;
      }

      const schema = mediaType.schema;
      const name = requestSchemaName({
        method,
        nameBuilder: config.nameBuilder,
        operationId: operation.operationId,
        path,
        schema,
      });
      const symbol = plugin.symbol(name, {
        meta: {
          category: 'schema',
          resource: 'request',
          resourceId: operation.operationId ?? `${method}:${path}`,
          tool: 'json-schema',
        },
      });
      const obj = schemaToJsonSchema2020_12({
        context,
        plugin,
        schema,
      });
      const statement = $.const(symbol)
        .export()
        .assign(
          $(
            $.fromValue(obj, {
              layout: 'pretty',
            }),
          ).as('const'),
        );
      plugin.node(statement);
    }
  }
};

export const handler: HeyApiSchemasPlugin['Handler'] = ({ plugin }) => {
  if ('swagger' in plugin.context.spec) {
    const context = plugin.context as Context<OpenApi.V2_0_X>;
    schemasV2_0_X({ context, plugin });
    requestSchemasV2_0_X({ context, plugin });
    return;
  }

  if (satisfies(plugin.context.spec.openapi, '>=3.0.0 <3.1.0')) {
    const context = plugin.context as Context<OpenApi.V3_0_X>;
    schemasV3_0_X({ context, plugin });
    requestSchemasV3_0_X({ context, plugin });
    return;
  }

  if (satisfies(plugin.context.spec.openapi, '>=3.1.0')) {
    const context = plugin.context as Context<OpenApi.V3_1_X>;
    schemasV3_1_X({ context, plugin });
    requestSchemasV3_1_X({ context, plugin });
    return;
  }

  throw new Error('Unsupported OpenAPI specification');
};
