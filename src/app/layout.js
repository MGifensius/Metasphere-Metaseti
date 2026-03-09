import './globals.css';

export const metadata = {
  title: 'Metasphere — Internal System',
  description: 'PT Metaseti Digital Indonesia',
  icons: { icon: '/icon.png' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
