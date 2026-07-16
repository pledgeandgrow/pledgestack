import type { ReactNode } from 'react';
import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>PledgeStack Playground</title>
      </head>
      <body>
        <div id="__pledge_root__">{children}</div>
      </body>
    </html>
  );
}
