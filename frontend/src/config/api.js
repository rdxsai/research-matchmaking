// API Configuration
// This file centralizes API endpoint configuration for different environments

const API_CONFIG = {
  // Use relative URLs in production (works with Nginx reverse proxy)
  // Use localhost in development
  BASE_URL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:8000',
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    
    // Profile
    PROFILE_ME: '/profile/me',
    PROFILE_BY_ID: (id) => `/profile/${id}`,
    
    // Matching
    MATCH: '/api/match',
    
    // Saved Matches
    SAVED_MATCHES: '/matches/saved',
    SAVE_MATCH: (profileId) => `/matches/save/${profileId}`,
    DELETE_SAVED_MATCH: (profileId) => `/matches/saved/${profileId}`,
  }
};

// Helper function to get full URL
export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Export endpoints for easy access
export const API_ENDPOINTS = API_CONFIG.ENDPOINTS;

export default API_CONFIG;
