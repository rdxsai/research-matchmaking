import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    organization: '',
    customOrganization: '',
    seek_share: '',
    resource_type: [],
    customResourceType: '',
    description: '',
    research_area: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Define registration steps
  const steps = [
    {
      id: 'email',
      title: 'Email Address',
      subtitle: 'Enter your email address',
      type: 'email',
      required: true
    },
    {
      id: 'password',
      title: 'Password',
      subtitle: 'Create a secure password (min 6 characters)',
      type: 'password',
      required: true
    },
    {
      id: 'name',
      title: 'Full Name',
      subtitle: 'Enter your full name',
      type: 'text',
      required: true
    },
    {
      id: 'organization',
      title: 'Organization',
      subtitle: 'Select your organization',
      type: 'organization_select',
      options: [
        'Carilion Clinic - Department of Medicine',
        'Virginia Tech',
        'Virginia Tech - FBRI',
        'Other'
      ],
      required: true
    },
    {
      id: 'seek_share',
      title: 'Seeking or Sharing',
      subtitle: 'Are you seeking or sharing resources?',
      type: 'radio',
      options: ['seek', 'share'],
      required: true
    },
    {
      id: 'resource_type',
      title: 'Resource Type',
      subtitle: 'Select all resource types you are interested in (at least one required)',
      type: 'checkbox',
      options: ['collaboration', 'expertise', 'mentorship', 'grants', 'equipment', 'data', 'other'],
      required: true
    },
    {
      id: 'research_area',
      title: 'Research Area',
      subtitle: 'Enter your research area',
      type: 'text',
      required: true
    },
    {
      id: 'description',
      title: 'Description',
      subtitle: 'Describe your research interests and what you\'re looking for',
      type: 'textarea',
      required: true
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) { 
      setErrors(prev => ({ ...prev, [name]: '' })); 
    }
  };

  const handleRadioChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) { 
      setErrors(prev => ({ ...prev, [field]: '' })); 
    }
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => {
      const currentValues = prev[field] || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];
      return { ...prev, [field]: newValues };
    });
    if (errors[field]) { 
      setErrors(prev => ({ ...prev, [field]: '' })); 
    }
  };

  const validateStep = (stepIndex) => {
    const step = steps[stepIndex];
    const newErrors = {};

    if (step.required) {
      if (step.type === 'checkbox') {
        if (!formData[step.id] || formData[step.id].length === 0) {
          newErrors[step.id] = `${step.title} is required`;
        } else if (formData[step.id].includes('other')) {
          // If "Other" is selected, custom resource type is mandatory
          if (!formData.customResourceType || formData.customResourceType.trim() === '') {
            newErrors.customResourceType = 'Please specify your resource type';
          }
        }
      } else if (step.type === 'radio') {
        if (!formData[step.id]) {
          newErrors[step.id] = `${step.title} is required`;
        }
      } else if (step.type === 'organization_select') {
        if (!formData[step.id] || formData[step.id].trim() === '') {
          newErrors[step.id] = `${step.title} is required`;
        } else if (formData[step.id] === 'Other') {
          // If "Other" is selected, custom organization is mandatory
          if (!formData.customOrganization || formData.customOrganization.trim() === '') {
            newErrors.customOrganization = 'Please specify your organization';
          }
        }
      } else {
        if (!formData[step.id] || formData[step.id].trim() === '') {
          newErrors[step.id] = `${step.title} is required`;
        }
      }
    }

    if (step.id === 'email' && formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    if (step.id === 'password' && formData.password) {
      if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    
    setIsLoading(true);
    setApiError('');
    setSuccessMessage('');

    try {
      // Prepare form data for submission
      const submissionData = { ...formData };
      
      // If "Other" is selected for organization, use the custom organization value
      if (formData.organization === 'Other' && formData.customOrganization) {
        submissionData.organization = formData.customOrganization;
      }
      
      // Convert resource_type array to comma-separated string for backend
      if (Array.isArray(formData.resource_type)) {
        let resourceTypes = [...formData.resource_type];
        
        // If "Other" is selected and custom resource type is provided, replace "other" with custom value
        if (resourceTypes.includes('other') && formData.customResourceType) {
          const otherIndex = resourceTypes.indexOf('other');
          resourceTypes[otherIndex] = formData.customResourceType;
        }
        
        submissionData.resource_type = resourceTypes.join(', ');
      }
      
      // Remove custom fields from submission as they're not needed by backend
      delete submissionData.customOrganization;
      delete submissionData.customResourceType;

      const response = await fetch(getApiUrl(API_ENDPOINTS.REGISTER), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Registration failed');
      }

      const data = await response.json();
      setSuccessMessage(data.message || 'Registration successful! Please log in to continue.');
      // Redirect to login page instead of auto-login to avoid token issues
      setTimeout(() => {
        navigate('/login');
      }, 2000); // Give user time to see success message
    } catch (error) {
      console.error('Registration error:', error);
      setApiError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  const currentStepData = steps[currentStep];

  const renderStepContent = () => {
    const stepData = steps[currentStep];
    const fieldName = stepData.id;
    const fieldValue = formData[fieldName];
    const fieldError = errors[fieldName];

    switch (stepData.type) {
      case 'text':
      case 'email':
      case 'password':
        return (
          <div className="space-y-2">
            <input
              type={stepData.type}
              name={fieldName}
              value={fieldValue || ''}
              onChange={handleInputChange}
              placeholder={stepData.subtitle}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50 focus:bg-white transition-colors"
              disabled={isLoading}
            />
            {fieldError && (
              <p className="text-red-500 text-xs mt-1">{fieldError}</p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div className="space-y-2">
            <textarea
              name={fieldName}
              value={fieldValue || ''}
              onChange={handleInputChange}
              placeholder={stepData.subtitle}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50 focus:bg-white transition-colors resize-none"
              disabled={isLoading}
            />
            {fieldError && (
              <p className="text-red-500 text-xs mt-1">{fieldError}</p>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {stepData.options.map((option) => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  value={option}
                  checked={fieldValue === option}
                  onChange={(e) => handleRadioChange(fieldName, option)}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                  disabled={isLoading}
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
            {fieldError && (
              <p className="text-red-500 text-xs mt-1">{fieldError}</p>
            )}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {stepData.options.map((option) => (
                <label key={option} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    value={option}
                    checked={fieldValue && fieldValue.includes(option)}
                    onChange={(e) => handleCheckboxChange(fieldName, option)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-gray-700 capitalize">{option}</span>
                </label>
              ))}
            </div>
            
            {/* Show custom input field when "Other" is selected */}
            {fieldValue && fieldValue.includes('other') && (
              <div className="space-y-2">
                <input
                  type="text"
                  name="customResourceType"
                  value={formData.customResourceType || ''}
                  onChange={handleInputChange}
                  placeholder="Please specify your resource type"
                  className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50 focus:bg-white transition-colors ${
                    errors.customResourceType ? 'border-red-400' : 'border-gray-200'
                  }`}
                  disabled={isLoading}
                />
                {errors.customResourceType && (
                  <p className="text-red-500 text-xs mt-1">{errors.customResourceType}</p>
                )}
              </div>
            )}
            
            {fieldError && (
              <p className="text-red-500 text-xs mt-1">{fieldError}</p>
            )}
          </div>
        );

      case 'organization_select':
        return (
          <div className="space-y-4">
            <select
              name={fieldName}
              value={fieldValue}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50 focus:bg-white transition-colors ${
                fieldError ? 'border-red-400' : 'border-gray-200'
              }`}
              disabled={isLoading}
            >
              <option value="">Select your organization</option>
              {stepData.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            
            {/* Show custom input field when "Other" is selected */}
            {fieldValue === 'Other' && (
              <div className="space-y-2">
                <input
                  type="text"
                  name="customOrganization"
                  value={formData.customOrganization || ''}
                  onChange={handleInputChange}
                  placeholder="Please specify your organization"
                  className={`w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-base bg-gray-50 focus:bg-white transition-colors ${
                    errors.customOrganization ? 'border-red-400' : 'border-gray-200'
                  }`}
                  disabled={isLoading}
                />
                {errors.customOrganization && (
                  <p className="text-red-500 text-xs mt-1">{errors.customOrganization}</p>
                )}
              </div>
            )}
            
            {fieldError && (
              <p className="text-red-500 text-xs mt-1">{fieldError}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <div className="space-y-2">
            <select
              name={fieldName}
              value={fieldValue}
              onChange={handleInputChange}
              className={`w-full p-4 border-2 rounded-xl text-base transition-all duration-200 bg-white focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 ${
                fieldError ? 'border-red-400' : 'border-gray-300'
              }`}
            >
              <option value="">Select {stepData.title.toLowerCase()}</option>
              {stepData.options.map((option) => (
                <option key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </option>
              ))}
            </select>
            {fieldError && <p className="text-red-500 text-sm mt-2">{fieldError}</p>}
          </div>
        );

      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="font-medium">Back to Home</span>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">📚</span>
            </div>
            <span className="text-xl font-bold text-gray-800">ResearchMatch</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Progress Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <span className="text-white font-bold text-lg">📚</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">ResearchMatch</h1>
            </div>
            
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Join ResearchMatch</h2>
              <p className="text-sm text-gray-600">Step {currentStep + 1} of {steps.length}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
            
            <div className="text-right text-sm text-gray-500">
              {Math.round(progressPercentage)}%
            </div>
          </div>

          {/* Step Content */}
          <div className="px-6 py-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {steps[currentStep].title}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {steps[currentStep].subtitle}
              </p>
            </div>
            
            <div className="mb-6">
              {renderStepContent()}
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
            <button
              onClick={handleBack}
              disabled={currentStep === 0 || isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="px-6 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span>{currentStep === steps.length - 1 ? 'Complete Registration' : 'Next'}</span>
              )}
              {!isLoading && currentStep < steps.length - 1 && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
          
          {/* Sign In Link */}
          <div className="px-6 py-3 bg-white text-center">
            <span className="text-sm text-gray-600">Already have an account? </span>
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Sign in here
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {(apiError || successMessage) && (
        <div className="px-8 py-4">
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{apiError}</p>
            </div>
          )}
          
          {successMessage && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-700">{successMessage}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Register;
