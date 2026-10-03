import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Keymap Config',
};

const KeymapLayout = ({ children }: { children: ReactNode }) => children;

export default KeymapLayout;
