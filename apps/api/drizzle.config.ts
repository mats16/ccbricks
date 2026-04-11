// apps/api/drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 現在のファイルのディレクトリパスを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// プロジェクトルートの .env ファイルを読み込む
config({ path: path.join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;

export default databaseUrl
  ? defineConfig({
      schema: './src/db/schema.pg.ts',
      out: './migrations',
      dialect: 'postgresql',
      dbCredentials: {
        url: databaseUrl,
      },
      verbose: true,
      strict: true,
    })
  : defineConfig({
      schema: './src/db/schema.sqlite.ts',
      out: './migrations-sqlite',
      dialect: 'sqlite',
      dbCredentials: {
        url: path.join(
          process.env.LAKEBROWNIE_BASE_DIR || path.join(__dirname, '../../tmp'),
          'db',
          'lakebrownie.sqlite'
        ),
      },
      verbose: true,
      strict: true,
    });
