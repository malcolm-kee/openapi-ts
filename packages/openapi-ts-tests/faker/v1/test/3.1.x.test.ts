import fs from 'node:fs';
import path from 'node:path';

import { createClient } from '@hey-api/openapi-ts';

import { getFilePaths } from '../../../utils';
import { snapshotsDir, tmpDir } from './constants';
import { createConfigFactory } from './utils';

const version = '3.1.x';

const outputDir = path.join(tmpDir, version);

describe(`OpenAPI ${version}`, () => {
  const createConfig = createConfigFactory({ openApiVersion: version, outputDir });

  const scenarios = [
    {
      config: createConfig({
        input: 'faker-basic.yaml',
        output: 'faker-basic',
      }),
      description: 'generates faker factories for basic schemas',
    },
    {
      config: createConfig({
        input: 'faker-basic.yaml',
        output: 'faker-basic-typed',
        plugins: ['@hey-api/typescript', '@faker-js/faker'],
      }),
      description: 'generates typed faker factories when typescript plugin is active',
    },
    {
      config: createConfig({
        input: 'faker-m1.yaml',
        output: 'faker-m1',
        plugins: ['@hey-api/typescript', '@faker-js/faker'],
      }),
      description: 'handles number, null, enum-with-null, array, $ref, and union schemas',
    },
    {
      config: createConfig({
        input: 'faker-m2.yaml',
        output: 'faker-m2',
        plugins: ['@hey-api/typescript', '@faker-js/faker'],
      }),
      description:
        'handles string formats, numeric constraints, array constraints, and default values',
    },
    {
      config: createConfig({
        input: 'faker-m3.yaml',
        output: 'faker-m3',
        plugins: ['@hey-api/typescript', '@faker-js/faker'],
      }),
      description: 'handles union randomization, allOf intersections, and discriminated unions',
    },
    {
      config: createConfig({
        input: 'faker-m4.yaml',
        output: 'faker-m4',
        plugins: ['@hey-api/typescript', '@faker-js/faker'],
      }),
      description:
        'infers faker helpers from property names with ancestor context and constraint merging',
    },
  ];

  it.each(scenarios)('$description', async ({ config }) => {
    await createClient(config);

    const outputString = config.output as string;
    const filePaths = getFilePaths(outputString);

    await Promise.all(
      filePaths.map(async (filePath) => {
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        await expect(fileContent).toMatchFileSnapshot(
          path.join(snapshotsDir, version, filePath.slice(outputDir.length + 1)),
        );
      }),
    );
  });
});
