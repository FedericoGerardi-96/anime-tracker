# Material Symbols registry

`material-symbols.codepoints` comes from Google's Material Design Icons project:
https://github.com/google/material-design-icons/blob/master/variablefont/MaterialSymbolsOutlined%5BFILL,GRAD,opsz,wght%5D.codepoints

Copyright Google LLC. Licensed under Apache-2.0 (see LICENSE.material-symbols).
Retrieved on 2026-10-24. Used only by the local icon subset generator; it is not shipped to the browser.

`node scripts/generate-icon-subset.mjs` collects icon names from source literals (including conditional icons and props). It runs before development and production builds, without network access. When adding an icon, use its complete literal name rather than assembling the name dynamically.
