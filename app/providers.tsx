'use client';

import { ThemeProvider } from '@/src/context/ThemeContext';
import { AuthProvider } from '@/src/context/AuthContext';
import { TabProvider } from '@/src/context/TabContext';
import { DemoModeProvider } from '@/src/context/DemoModeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DemoModeProvider>
          <TabProvider>
            {children}
          </TabProvider>
        </DemoModeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
