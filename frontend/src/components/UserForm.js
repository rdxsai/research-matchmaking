import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const UserForm = () => {
  const navigate = useNavigate();
  const { logout, getAuthHeaders } = useAuth();
  
  // --- Form State ---
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    action: '',
    resourceType: [],
    query: ''
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) { setErrors(prev => ({ ...prev, [name]: '' })); }
  };

  const handleRadioChange = (value) => {
    setFormData(prev => ({ ...prev, action: value }));
    if (errors.action) { setErrors(prev => ({ ...prev, action: '' })); }
  };

  const handleCheckboxChange = (value) => {
    setFormData(prev => ({
      ...prev,
      resourceType: prev.resourceType.includes(value)
        ? prev.resourceType.filter(item => item !== value)
        : [...prev.resourceType, value]
    }));
    if (errors.resourceType) { setErrors(prev => ({ ...prev, resourceType: '' })); }
  };

  const validateCurrentStep = () => {
    const newErrors = {};
    
    switch (currentStep) {
      case 0: // Name
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        break;
      case 1: // Email
        if (!formData.email.trim()) {
          newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = 'Please enter a valid email address';
        }
        break;
      case 2: // Phone
        if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
        break;
      case 3: // Action
        if (!formData.action) newErrors.action = 'Please select seek or share';
        break;
      case 4: // Resource Type
        if (formData.resourceType.length === 0) newErrors.resourceType = 'Please select at least one resource type';
        break;
      case 5: // Query
        if (!formData.query.trim()) newErrors.query = 'Please describe what you\'re looking for';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < 5) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrors({}); // Clear errors when going back
    }
  };

  const handleSubmit = async () => {
    console.log("Form submitted!");
    setIsLoading(true);
    setApiError('');

    const payload = {
      seek_share: formData.action,
      description: formData.query
    };
    
    console.log("Sending payload:", payload);

    try {
      console.log("Making API request...");
      const response = await fetch(getApiUrl(API_ENDPOINTS.MATCH), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("Received data:", data);
      
      // Navigate to results page with data
      navigate('/results', {
        state: {
          matches: data.matches || [],
          formData: formData
        }
      });

    } catch (error) {
      console.error("Full API Error:", error);
      setApiError(`Failed to fetch matches: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resourceTypes = [
    { id: 'collaboration', label: 'Collaboration' },
    { id: 'expertise', label: 'Expertise' },
    { id: 'mentorship', label: 'Mentorship' },
    { id: 'grants', label: 'Grants' }
  ];

  const steps = [
    {
      title: "What's your name?",
      subtitle: "Let's get started.",
      field: 'name',
      type: 'text',
      placeholder: 'Enter your full name'
    },
    {
      title: "What's your email?",
      subtitle: "We'll use this to contact you.",
      field: 'email',
      type: 'email',
      placeholder: 'Enter your email address'
    },
    {
      title: "What's your phone number?",
      subtitle: "For quick communication.",
      field: 'phone',
      type: 'tel',
      placeholder: 'Enter your phone number'
    },
    {
      title: "Are you seeking or sharing resources?",
      subtitle: "Choose your primary intent.",
      field: 'action',
      type: 'radio',
      options: ['seek', 'share']
    },
    {
      title: "What type of resources?",
      subtitle: "Select all that apply.",
      field: 'resourceType',
      type: 'checkbox',
      options: resourceTypes
    },
    {
      title: "Tell us more about what you're looking for",
      subtitle: "Be as detailed as possible.",
      field: 'query',
      type: 'textarea',
      placeholder: 'Please describe what you\'re looking for in detail...'
    }
  ];

  const currentStepData = steps[currentStep];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const renderStepContent = () => {
    switch (currentStepData.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <div className="space-y-4">
            <input
              type={currentStepData.type}
              name={currentStepData.field}
              value={formData[currentStepData.field]}
              onChange={handleInputChange}
              placeholder={currentStepData.placeholder}
              className={`w-full p-4 border-2 rounded-xl text-lg transition-all duration-200 bg-white focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 ${
                errors[currentStepData.field] ? 'border-red-400' : 'border-gray-300'
              }`}
              autoFocus
            />
            {errors[currentStepData.field] && (
              <p className="text-red-500 text-sm mt-2">{errors[currentStepData.field]}</p>
            )}
          </div>
        );
      
      case 'radio':
        return (
          <div className="space-y-4">
            <div className="flex gap-4">
              {currentStepData.options.map((option) => (
                <div
                  key={option}
                  onClick={() => handleRadioChange(option)}
                  className={`flex-1 p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 text-center font-medium capitalize ${
                    formData.action === option
                      ? 'border-slate-600 bg-slate-600 text-white'
                      : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-slate-400'
                  }`}
                >
                  <span className={formData.action === option ? 'text-white font-semibold' : 'text-gray-800'}>
                    {option}
                  </span>
                </div>
              ))}
            </div>
            {errors[currentStepData.field] && (
              <p className="text-red-500 text-sm mt-2">{errors[currentStepData.field]}</p>
            )}
          </div>
        );
      
      case 'checkbox':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {currentStepData.options.map((resource) => (
                <div
                  key={resource.id}
                  onClick={() => handleCheckboxChange(resource.id)}
                  className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 text-center font-medium ${
                    formData.resourceType.includes(resource.id)
                      ? 'border-slate-600 bg-slate-600 text-white'
                      : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-50 hover:border-slate-400'
                  }`}
                >
                  <span className={formData.resourceType.includes(resource.id) ? 'text-white font-semibold' : 'text-gray-800'}>
                    {resource.label}
                  </span>
                </div>
              ))}
            </div>
            {errors[currentStepData.field] && (
              <p className="text-red-500 text-sm mt-2">{errors[currentStepData.field]}</p>
            )}
          </div>
        );
      
      case 'textarea':
        return (
          <div className="space-y-4">
            <textarea
              name={currentStepData.field}
              value={formData[currentStepData.field]}
              onChange={handleInputChange}
              placeholder={currentStepData.placeholder}
              rows="6"
              className={`w-full p-4 border-2 rounded-xl text-lg transition-all duration-200 bg-white focus:outline-none focus:border-slate-600 focus:ring-2 focus:ring-slate-200 resize-vertical ${
                errors[currentStepData.field] ? 'border-red-400' : 'border-gray-300'
              }`}
              autoFocus
            />
            {errors[currentStepData.field] && (
              <p className="text-red-500 text-sm mt-2">{errors[currentStepData.field]}</p>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-200 via-rose-200 to-pink-300 flex flex-col items-center justify-center p-5">
      <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-10 shadow-lg max-w-2xl w-full border border-white/30">
        {/* Header with Logo and Logout */}
        <div className="flex justify-between items-center mb-8">
          <div></div>
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">m</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-slate-800 font-medium text-sm transition-colors duration-200"
          >
            Logout
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-500">Step {currentStep + 1} of {steps.length}</span>
            <span className="text-sm text-gray-500">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-slate-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            {currentStepData.title}
          </h1>
          <p className="text-lg text-gray-600">
            {currentStepData.subtitle}
          </p>
        </div>

        {/* Form Content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              className="flex-1 p-4 bg-gray-200 hover:bg-gray-300 text-gray-700 border-none rounded-xl text-lg font-medium cursor-pointer transition-all duration-200"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={isLoading}
            className="flex-1 p-4 bg-slate-700 hover:bg-slate-800 text-white border-none rounded-xl text-lg font-semibold cursor-pointer transition-all duration-200 hover:shadow-lg active:bg-slate-900 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Finding Matches...' : currentStep === steps.length - 1 ? 'Submit' : 'Next'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {apiError && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm max-w-2xl w-full mt-6">
          <p className="text-red-700 text-lg font-semibold">{apiError}</p>
        </div>
      )}
    </div>
  );
};

export default UserForm;