import type { Casing, FeatureToggle, NameTransformer, NamingOptions } from '@hey-api/shared';
import type { DefinePlugin, Plugin } from '@hey-api/shared';

import type { IApi } from './api';

export type UserConfig = Plugin.Name<'@faker-js/faker'> &
  Plugin.Hooks &
  Plugin.UserExports & {
    // Resolvers & {
    /**
     * Casing convention for generated names.
     *
     * @default 'camelCase'
     */
    case?: Casing;
    /**
     * Configuration for reusable schema definitions.
     *
     * Can be:
     * - `boolean`: Shorthand for `{ enabled: boolean }`
     * - `string` or `function`: Shorthand for `{ name: string | function }`
     * - `object`: Full configuration object
     */
    definitions?:
      | boolean
      | NameTransformer
      | {
          /**
           * Casing convention for generated names.
           *
           * @default 'camelCase'
           */
          case?: Casing;
          /**
           * Whether this feature is enabled.
           *
           * @default true
           */
          enabled?: boolean;
          /**
           * Naming pattern for generated names.
           *
           * @default 'fake{{name}}'
           */
          name?: NameTransformer;
        };
    /**
     * Locale for `@faker-js/faker`. When set, the generated import for the
     * faker instance will use `@faker-js/faker/locale/{locale}` instead of
     * `@faker-js/faker`.
     *
     * @see https://fakerjs.dev/guide/localization
     */
    locale?: string;
    /**
     * Configuration for operation request data factories.
     *
     * Can be:
     * - `boolean`: Shorthand for `{ enabled: boolean }`
     * - `string` or `function`: Shorthand for `{ name: string | function }`
     * - `object`: Full configuration object
     */
    requests?:
      | boolean
      | NameTransformer
      | {
          /**
           * Casing convention for generated names.
           *
           * @default 'camelCase'
           */
          case?: Casing;
          /**
           * Whether this feature is enabled.
           *
           * @default true
           */
          enabled?: boolean;
          /**
           * Naming pattern for generated names.
           *
           * @default 'fake{{name}}Request'
           */
          name?: NameTransformer;
        };
    /**
     * Configuration for operation response factories.
     *
     * Can be:
     * - `boolean`: Shorthand for `{ enabled: boolean }`
     * - `string` or `function`: Shorthand for `{ name: string | function }`
     * - `object`: Full configuration object
     */
    responses?:
      | boolean
      | NameTransformer
      | {
          /**
           * Casing convention for generated names.
           *
           * @default 'camelCase'
           */
          case?: Casing;
          /**
           * Whether this feature is enabled.
           *
           * @default true
           */
          enabled?: boolean;
          /**
           * Naming pattern for generated names.
           *
           * @default 'fake{{name}}Response'
           */
          name?: NameTransformer;
        };
  };

export type Config = Plugin.Name<'@faker-js/faker'> &
  Plugin.Hooks &
  Plugin.Exports & {
    // Resolvers & {
    /** Casing convention for generated names. */
    case: Casing;
    /** Configuration for reusable schema definitions. */
    definitions: NamingOptions & FeatureToggle;
    /** Locale for `@faker-js/faker`. */
    locale?: string;
    /** Configuration for operation request data factories. */
    requests: NamingOptions & FeatureToggle;
    /** Configuration for operation response factories. */
    responses: NamingOptions & FeatureToggle;
  };

export type FakerJsFakerPlugin = DefinePlugin<UserConfig, Config, IApi>;
