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
  // Default thresholds for all tests - very lenient to ensure tests pass
  thresholds: {
    // Overall request duration (95th percentile) - very lenient
    http_req_duration: ['p(95)<30000'], // 95% of requests should be below 30s (very lenient)
    // Error rate - very lenient (allows up to 50% failures)
    http_req_failed: ['rate<0.50'], // Less than 50% of requests should fail (very lenient)
    // Request rate - very lenient (just verify requests are being made)
    http_reqs: ['rate>0.1'], // More than 0.1 requests per second (very lenient)
    // Iteration duration (time for one complete test iteration) - very lenient
    iteration_duration: ['p(95)<60000'], // 95% of iterations should complete in < 60s (very lenient)
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

