import { $ } from '../../../../ts-dsl';
import type { EmitTracking, FakerWalkerContext } from './types';

/**
 * Creates the shared walker context with the faker accessor expression.
 *
 * The accessor is `f` — a local variable declared in each function body
 * as `const f = options?.faker ?? faker`.
 */
export function createFakerWalkerContext(tracking: EmitTracking): FakerWalkerContext {
  const optionsId = $('options');
  const fakerAccessor = $('f');

  return {
    fakerAccessor,
    optionsId,
    tracking,
  };
}
