import { pathToJsonPointer } from '@hey-api/shared';

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
