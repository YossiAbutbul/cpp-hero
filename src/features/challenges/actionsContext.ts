import { createContext, type ReactNode } from 'react';
import type { CheckSpec } from './types';

/** Provided by the runner: renders the Hint + Check row for the current phase. */
export const ActionsContext = createContext<(c: CheckSpec | null) => ReactNode>(() => null);
