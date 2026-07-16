import type { ReactNode } from 'react';

export default function BlogLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Blog</h2>
      {children}
    </div>
  );
}
