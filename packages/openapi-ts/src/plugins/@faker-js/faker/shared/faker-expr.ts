import { $ } from '../../../../ts-dsl';
import type { FakerJsFakerPlugin } from '../types';
import type { FakerWalkerContext } from './types';

/**
 * Creates the shared walker context with the faker accessor expression.
 *
 * The accessor is `(options?.faker ?? faker)` — it falls back to the
 * default `faker` import when the user doesn't provide a custom instance.
 */
export function createFakerWalkerContext(
  plugin: FakerJsFakerPlugin['Instance'],
): FakerWalkerContext {
  const fakerSymbol = plugin.external('@faker-js/faker.faker');
  const optionsId = $('options');

  // (options?.faker ?? faker)
  const fakerAccessor = $($.binary($(optionsId).attr('faker').optional(), '??', $(fakerSymbol)));

  return {
    fakerAccessor,
    optionsId,
  };
}
