import 'dotenv/config';
import {defineConfig} from 'prisma/config';

// Prisma 7 configuration. DATABASE_URL comes from the environment (commerce/.env locally, Hostinger panel in production).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {path: 'prisma/migrations'},
  datasource: {url: process.env['DATABASE_URL']},
});
