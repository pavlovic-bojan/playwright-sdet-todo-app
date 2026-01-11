import { test as base, APIRequestContext } from '@playwright/test';
import { TodoApiService } from '../services/api/TodoApiService';
import { UserApiService } from '../services/api/UserApiService';
import { TodoDbService } from '../services/db/TodoDbService';
import { UserDbService } from '../services/db/UserDbService';
import { Client } from 'pg';

/**
 * Extended test fixtures with API and DB services
 */
type TestFixtures = {
  todoApi: TodoApiService;
  userApi: UserApiService;
  todoDb: TodoDbService;
  userDb: UserDbService;
  dbClient: Client;
  apiRequestContext: APIRequestContext;
};

export const test = base.extend<TestFixtures>({
  // API Request Context - create a new context for API tests
  apiRequestContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000/api',
    });
    await use(context);
    await context.dispose();
  },

  // Todo API Service
  todoApi: async ({ apiRequestContext }, use) => {
    const apiUrl = process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000/api';
    const todoApi = new TodoApiService(apiRequestContext, apiUrl);
    await use(todoApi);
  },

  // User API Service
  userApi: async ({ apiRequestContext }, use) => {
    const apiUrl = process.env.API_URL || process.env.BASE_URL || 'http://localhost:3000/api';
    const userApi = new UserApiService(apiRequestContext, apiUrl);
    await use(userApi);
  },

  // Database Client
  dbClient: async ({}, use) => {
    const dbUrl = process.env.DB_URL;
    if (!dbUrl) {
      throw new Error('DB_URL environment variable is not set');
    }

    const client = new Client({
      connectionString: dbUrl,
      connectionTimeoutMillis: 10000, // 10 seconds connection timeout
    });

    try {
      await client.connect();
      await use(client);
    } finally {
      await client.end();
    }
  },

  // Todo Database Service
  todoDb: async ({ dbClient }, use) => {
    const todoDb = new TodoDbService(dbClient);
    await use(todoDb);
  },

  // User Database Service
  userDb: async ({ dbClient }, use) => {
    const userDb = new UserDbService(dbClient);
    await use(userDb);
  },
});

export { expect } from '@playwright/test';