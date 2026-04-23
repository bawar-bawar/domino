import './globals.css';

export const metadata = {
  title: 'dominos — Multiplayer Dominoes',
  description: 'Multiplayer dominoes, the long way ’round.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,900;1,9..144,700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#1a120a] font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
