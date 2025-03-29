import { ReactNode } from 'react';

interface GlobalProviderProps {
  children: ReactNode;
}

export function GlobalProvider({ children }: GlobalProviderProps) {
  return <>{children}</>;
}