import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const { logout, getAuthHeaders } = useAuth();
  const [showNewSearch, setShowNewSearch] = useState(false);
  const [formData, setFormData] = useState({
    seek_share: '',
    resource_type: [],
    research_area: '',
    description: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCheckboxChange = (value) => {
    setFormData(prev => ({
      ...prev,
      resource_type: prev.resource_type.includes(value)
        ? prev.resource_type.filter(item => item !== value)
        : [...prev.resource_type, value]
    }));
    if (errors.resource_type) {
      setErrors(prev => ({ ...prev, resource_type: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.seek_share) {
      newErrors.seek_share = 'Please select whether you are seeking or sharing resources';
    }
    
    if (formData.resource_type.length === 0) {
      newErrors.resource_type = 'Please select at least one resource type';
    }
    
    if (!formData.research_area.trim()) {
      newErrors.research_area = 'Research area is required';
    }
    
    if (!formData.description.trim()) {
      newErrors.description = 'Brief description is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      // Create payload matching the backend MatchRequest model
      const payload = {
        seek_share: formData.seek_share,
        description: formData.description
      };
      
      console.log('=== DASHBOARD SEARCH DEBUG ===');
      console.log('Form data:', formData);
      console.log('Payload being sent:', payload);
      console.log('Auth headers:', getAuthHeaders());
      console.log('Making API request to:', getApiUrl(API_ENDPOINTS.MATCH));
      
      const response = await fetch(getApiUrl(API_ENDPOINTS.MATCH), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        throw new Error('Failed to find matches');
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      const matches = data.matches || data;
      console.log('Extracted matches:', matches);
      
      // Map form data to match Results component expectations
      const mappedFormData = {
        query: formData.description,
        action: formData.seek_share,
        research_area: formData.research_area,
        resource_type: formData.resource_type,
        description: formData.description,
        seek_share: formData.seek_share
      };
      
      console.log('Mapped form data for Results:', mappedFormData);
      console.log('Navigating to results with:', { matches, formData: mappedFormData });
      
      navigate('/results', { state: { matches, formData: mappedFormData } });
      
    } catch (error) {
      console.error('Error finding matches:', error);
      setErrors({ submit: 'Failed to find matches. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setShowNewSearch(false);
    setFormData({
      seek_share: '',
      resource_type: [],
      research_area: '',
      description: ''
    });
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">📚</span>
            </div>
            <span className="text-xl font-bold text-gray-800">ResearchMatch</span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/my-matches')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              My Matches
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {!showNewSearch ? (
          /* Dashboard View */
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
            <p className="text-lg text-gray-600 mb-8">Discover new research opportunities and connect with fellow researchers.</p>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md mx-auto">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">New Search</h2>
              <p className="text-sm text-gray-600 mb-6">Looking for something different? Create a new search to find matches for other research interests.</p>
              <button
                onClick={() => setShowNewSearch(true)}
                className="w-full px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors"
              >
                New Search
              </button>
            </div>
          </div>
        ) : (
          /* New Search Form */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">New Search</h2>
              <p className="text-sm text-gray-600">Create a new search to find matches for your research interests.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Seek/Share Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Are you looking to seek or share resources?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="seek_share"
                      value="seek"
                      checked={formData.seek_share === 'seek'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Seek</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="seek_share"
                      value="share"
                      checked={formData.seek_share === 'share'}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-700">Share</span>
                  </label>
                </div>
                {errors.seek_share && <p className="text-red-500 text-xs mt-1">{errors.seek_share}</p>}
              </div>

              {/* Resource Type */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Resource Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Expertise', 'Collaboration', 'Grants', 'Mentorship'].map((type) => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.resource_type.includes(type)}
                        onChange={() => handleCheckboxChange(type)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">{type}</span>
                    </label>
                  ))}
                </div>
                {errors.resource_type && <p className="text-red-500 text-xs mt-1">{errors.resource_type}</p>}
              </div>

              {/* Research Area */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Research Area
                </label>
                <input
                  type="text"
                  name="research_area"
                  value={formData.research_area}
                  onChange={handleInputChange}
                  placeholder="e.g., Machine Learning, Biology, Psychology"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50 focus:bg-white transition-colors"
                />
                {errors.research_area && <p className="text-red-500 text-xs mt-1">{errors.research_area}</p>}
              </div>

              {/* Brief Description */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Brief Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe what you're looking for..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50 focus:bg-white transition-colors resize-none"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              {/* Error Display */}
              {errors.submit && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{errors.submit}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Searching...</span>
                    </>
                  ) : (
                    <span>Search Matches</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
