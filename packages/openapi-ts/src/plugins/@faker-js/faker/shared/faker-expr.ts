import { $ } from '../../../../ts-dsl';
import type { EmitTracking, FakerWalkerContext } from './types';

/**
 * Creates the shared walker context with the faker accessor expression.
 *
 * The accessor is `ensureFaker(options)` — the helper resolves
 * `options?.faker ?? faker` so each call site stays clean.
 */
export function createFakerWalkerContext(tracking: EmitTracking): FakerWalkerContext {
  const optionsId = $('options');

  // ensureFaker(options)
  const fakerAccessor = $($('ensureFaker').call(optionsId));

  return {
    fakerAccessor,
    optionsId,
    tracking,
  };
}
