import { copyFile } from 'node:fs/promises';

// Give Home Screen installations a launch URL separate from older cached index pages.
// Both entry points use the same source, scripts, cookie path, and manifest identity.
await copyFile(new URL('../dist/index.html', import.meta.url), new URL('../dist/player.html', import.meta.url));
