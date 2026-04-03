import { definePluginConfig, mappers } from '@hey-api/shared';

import { Api } from './api';
import { handler } from './plugin';
import type { FakerJsFakerPlugin } from './types';

export const defaultConfig: FakerJsFakerPlugin['Config'] = {
  api: new Api(),
  config: {
    case: 'camelCase',
    includeInEntry: false,
  },
  handler,
  name: '@faker-js/faker',
  resolveConfig: (plugin, context) => {
    plugin.config.definitions = context.valueToObject({
      defaultValue: {
        case: plugin.config.case ?? 'camelCase',
        enabled: true,
        name: 'fake{{name}}',
      },
      mappers,
      value: plugin.config.definitions,
    });

    plugin.config.responses = context.valueToObject({
      defaultValue: {
        case: plugin.config.case ?? 'camelCase',
        enabled: true,
        name: 'fake{{name}}Response',
      },
      mappers,
      value: plugin.config.responses,
    });
  },
  tags: ['mocker'],
};

/**
 * Type helper for Faker plugin, returns {@link Plugin.Config} object
 */
export const defineConfig = definePluginConfig(defaultConfig);
