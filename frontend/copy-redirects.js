import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  copyFileSync(
    join(__dirname, 'public', '_redirects'),
    join(__dirname, 'dist', '_redirects')
  );
  console.log('✅ _redirects file copied to dist/');
} catch (err) {
  console.error('❌ Failed to copy _redirects:', err.message);
  process.exit(1);
}
