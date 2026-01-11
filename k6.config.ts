import { Options } from 'k6/options';

/**
 * k6 Performance Test Configuration
 * Shared configuration for all performance tests
 * 
 * Best Practices:
 * - Comprehensive threshold definitions
 * - Detailed summary statistics
 * - Environment-based configuration
 */
export const defaultOptions: Partial<Options> = {
  // Default thresholds for all tests
  thresholds: {
    // Overall request duration (95th percentile)
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    // Error rate
    http_req_failed: ['rate<0.01'], // Less than 1% of requests should fail
    // Request rate
    http_reqs: ['rate>10'], // More than 10 requests per second
    // Iteration duration (time for one complete test iteration)
    iteration_duration: ['p(95)<5000'], // 95% of iterations should complete in < 5s
  },
  // Summary output - comprehensive statistics
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
  // Discard response bodies to save memory (set to false if you need response bodies)
  discardResponseBodies: true,
  // System tags for better metric organization
  systemTags: ['name', 'method', 'status', 'error', 'error_code', 'group', 'check'],
};

/**
 * Get API URL from environment or use default
 */
export function getApiUrl(): string {
  return __ENV.API_URL || __ENV.BASE_URL || 'https://todo-app-xhn2.onrender.com/api';
}

/**
 * Get base URL from environment or use default
 */
export function getBaseUrl(): string {
  return __ENV.BASE_URL || 'https://todo-app-frontend-seven-rho.vercel.app';
}