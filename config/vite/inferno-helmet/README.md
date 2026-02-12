# Inferno Helmet

Inferno-first Helmet implementation for managing head tags and html/body attributes.

## Install (local)

Use as a local workspace dependency or alias the source folder via Vite.

## CSR usage

Wrap the app once:

```tsx
import { render } from 'inferno';
import { HelmetProvider } from 'inferno-helmet';
import { App } from './App';

render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
  document.getElementById('app')!,
);
```

In any component:

```tsx
import { Helmet } from 'inferno-helmet';

export const Page = () => (
  <div>
    <Helmet>
      <title>Home</title>
      <meta name="description" content="Home page" />
      <link rel="canonical" href="https://example.com" />
    </Helmet>
    <h1>Home</h1>
  </div>
);
```

Default values can be set in a global Helmet at the App root, and page-level
Helmets override them while mounted.

## SSR usage

```tsx
import { HelmetProvider, type HelmetDataContext } from 'inferno-helmet';
import { renderToString } from 'inferno-server';

const context: HelmetDataContext = {};
const html = renderToString(
  <HelmetProvider context={context}>
    <App />
  </HelmetProvider>,
);

const head = (context.helmet?.title.toString() ?? '')
  + (context.helmet?.meta.toString() ?? '')
  + (context.helmet?.link.toString() ?? '');
```

## Build

Uses SWC to generate CommonJS and ESM outputs:

```
npm run build
```
