import type { FakerJsFakerPlugin } from './types';
import { handlerV10 } from './v10/plugin';

export const handler: FakerJsFakerPlugin['Handler'] = (args) => handlerV10(args);
