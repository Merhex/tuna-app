import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { AppData } from './storage';

export interface AppCtx {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => void;
}

export const AppContext = createContext<AppCtx>(null as unknown as AppCtx);
export const useApp = () => useContext(AppContext);
