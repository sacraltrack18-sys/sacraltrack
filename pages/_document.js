import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="referrer" content="no-referrer" />
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cloud.appwrite.io https://*.netlify.app; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*; media-src 'self' blob: data: https://*; connect-src 'self' https://cloud.appwrite.io https://*.netlify.app https://*; font-src 'self' data:; object-src 'none'; worker-src 'self' blob:;" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 