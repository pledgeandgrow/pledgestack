import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        <header className="border-b border-gray-200 px-6 py-4">
          <nav className="mx-auto flex max-w-3xl items-center justify-between">
            <a href="/" className="text-xl font-bold">PledgeStack Blog</a>
            <div className="flex gap-4 text-sm">
              <a href="/" className="hover:underline">Home</a>
              <a href="/blog" className="hover:underline">Blog</a>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
        <footer className="border-t border-gray-200 px-6 py-4 text-center text-sm text-gray-500">
          Built with PledgeStack
        </footer>
      </body>
    </html>
  );
}
