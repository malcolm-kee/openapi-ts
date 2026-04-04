import type { DefinePlugin, Plugin } from '@hey-api/shared';
import type { OpenAPIV2, OpenAPIV3, OpenAPIV3_1 } from '@hey-api/spec-types';

export type UserConfig = Plugin.Name<'@hey-api/schemas'> &
  Plugin.Hooks &
  Plugin.UserExports & {
    /**
     * Customise the schema name. By default, `{{name}}Schema` is used. `name` is a
     * valid JavaScript/TypeScript identifier, e.g., if your schema name is
     * "Foo-Bar", `name` value would be "FooBar".
     *
     * @default '{{name}}Schema'
     */
    nameBuilder?:
      | string
      | ((
          name: string,
          schema:
            | OpenAPIV2.SchemaObject
            | OpenAPIV3.ReferenceObject
            | OpenAPIV3.SchemaObject
            | OpenAPIV3_1.SchemaObject,
        ) => string);
    /**
     * Configuration for generating request body schemas from operations.
     * When enabled, generates JSON Schema exports for each operation's
     * request body. This is useful for server-side request validation.
     *
     * Can be:
     * - `boolean`: Enable or disable request schema generation
     * - `object`: Full configuration object
     *
     * @default false
     */
    requests?:
      | boolean
      | {
          /**
           * Enable or disable request schema generation.
           *
           * @default true
           */
          enabled?: boolean;
          /**
           * Customise the request schema name. By default,
           * `{{name}}RequestSchema` is used. `name` is derived from the
           * operation ID or method + path.
           *
           * @default '{{name}}RequestSchema'
           */
          nameBuilder?:
            | string
            | ((
                name: string,
                schema:
                  | OpenAPIV2.SchemaObject
                  | OpenAPIV3.ReferenceObject
                  | OpenAPIV3.SchemaObject
                  | OpenAPIV3_1.SchemaObject,
              ) => string);
        };
    /**
     * Choose schema type to generate. Select 'form' if you don't want
     * descriptions to reduce bundle size and you plan to use schemas
     * for form validation
     *
     * @default 'json'
     */
    type?: 'form' | 'json';
  };

export type HeyApiSchemasPlugin = DefinePlugin<UserConfig, UserConfig>;
