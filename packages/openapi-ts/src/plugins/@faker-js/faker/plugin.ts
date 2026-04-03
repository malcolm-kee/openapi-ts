import type { FakerJsFakerPlugin } from './types';
import { handlerV1 } from './v1/plugin';

export const handler: FakerJsFakerPlugin['Handler'] = (args) => handlerV1(args);
