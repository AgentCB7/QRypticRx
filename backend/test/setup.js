require('dotenv').config();

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Refusing to run tests against DATABASE_URL ' +
    '(it would TRUNCATE production tables). Set TEST_DATABASE_URL to a throwaway database.'
  );
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.NODE_ENV = 'test';
process.env.KEY_SECRET = process.env.KEY_SECRET || 'test-key-secret';
