import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Resources',
};

const ResourcesLayout = ({ children }: { children: ReactNode }) => children;

export default ResourcesLayout;
