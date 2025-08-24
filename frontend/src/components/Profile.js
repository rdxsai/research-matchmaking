import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const Profile = () => {
  const navigate = useNavigate();
  const { logout, getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [customResourceType, setCustomResourceType] = useState('');
  const [saving, setSaving] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.PROFILE_ME), {
        headers: getAuthHeaders()
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        
        // Convert resource_type string to array for multi-select functionality
        const processedData = { ...data };
        if (data.resource_type && typeof data.resource_type === 'string') {
          let resourceTypes = [];
          
          if (data.resource_type.includes(', ')) {
            resourceTypes = data.resource_type.split(', ').map(item => item.trim());
          } else if (data.resource_type.includes(',')) {
            resourceTypes = data.resource_type.split(',').map(item => item.trim());
          } else {
            resourceTypes = [data.resource_type.trim()];
          }
          
          resourceTypes = resourceTypes.filter(type => type.length > 1);
          
          const standardTypes = ['collaboration', 'expertise', 'mentorship', 'grants', 'equipment', 'data'];
          const customTypes = resourceTypes.filter(type => !standardTypes.includes(type.toLowerCase()));
          
          if (customTypes.length > 0) {
            processedData.resource_type = [...resourceTypes.filter(type => standardTypes.includes(type.toLowerCase())), 'other'];
            setCustomResourceType(customTypes[0]);
          } else {
            processedData.resource_type = resourceTypes;
          }
        }
        
        setFormData(processedData);
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const submissionData = { ...formData };
      if (Array.isArray(formData.resource_type)) {
        let resourceTypes = [...formData.resource_type];
        
        if (resourceTypes.includes('other') && customResourceType) {
          const otherIndex = resourceTypes.indexOf('other');
          resourceTypes[otherIndex] = customResourceType;
        }
        
        submissionData.resource_type = resourceTypes.join(', ');
      }

      const response = await fetch(getApiUrl(API_ENDPOINTS.PROFILE_ME), {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        // Refresh the page data
        fetchProfile();
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(profile);
    setEditing(false);
    setCustomResourceType('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleFindMatches = () => {
    navigate('/dashboard');
  };

  const handleChipClick = (type, value) => {
    // Navigate to matches page with filter in query string
    const searchParams = new URLSearchParams();
    searchParams.set(type, value);
    navigate(`/results?${searchParams.toString()}`);
  };

  const copyToClipboard = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const formatResourceTypes = (resourceTypeString) => {
    if (!resourceTypeString) return [];
    
    let types = [];
    if (resourceTypeString.includes(', ')) {
      types = resourceTypeString.split(', ');
    } else if (resourceTypeString.includes(',')) {
      types = resourceTypeString.split(',');
    } else {
      types = [resourceTypeString];
    }
    
    return types.map(type => type.trim()).filter(type => type.length > 1);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'resource_type') {
      if (type === 'checkbox') {
        setFormData(prev => {
          const currentTypes = Array.isArray(prev.resource_type) ? prev.resource_type : [];
          if (checked) {
            return { ...prev, resource_type: [...currentTypes, value] };
          } else {
            return { ...prev, resource_type: currentTypes.filter(t => t !== value) };
          }
        });
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-pink-100 flex items-center justify-center">
        <div className="text-slate-600 text-lg">Profile not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with Navigation */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">RM</span>
              </div>
              <h1 className="text-xl font-semibold text-slate-800">ResearchMatch</h1>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-slate-600 hover:text-slate-800 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/my-matches')}
                className="text-slate-600 hover:text-slate-800 transition-colors"
              >
                My Matches
              </button>
              <span className="text-slate-400">|</span>
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-slate-600 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 rounded-md px-2 py-1"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-slate-600 font-medium text-sm">
                      {profile.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-slate-200">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="bg-white/80 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-6 md:space-y-0">
            <div className="flex items-center space-x-1">
              {/* Large Avatar */}
              <div className="w-20 h-20 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {profile.name?.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || 'U'}
                </span>
              </div>
              
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-800">{profile.name}</h1>
                <p className="text-lg text-slate-600">{profile.organization}</p>
                
                {/* Key Info Pills */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {profile.seek_share === 'seek' ? '🔍 Looking For' : '🤝 Sharing'}
                  </span>
                  
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    🧬 {profile.research_area}
                  </span>
                  
                  {formatResourceTypes(profile.resource_type).map((type, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                    >
                      📚 {type.charAt(0).toUpperCase() + type.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleFindMatches}
                className="px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 shadow-lg"
              >
                🔍 Find Matches
              </button>
              <button
                onClick={() => {
                  setFormData({
                    ...profile,
                    status: profile.status || 'active'  // Ensure status field is initialized
                  });
                  setEditing(!editing);
                }}
                className="px-6 py-3 border border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                ✏️ Edit Profile
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Contact Information */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-800">Contact Information</h2>
              <span className="text-xs text-slate-500">Last updated: Today</span>
            </div>
            
            <div className="space-y-4">
              {profile.email && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-600">📧</span>
                      <a
                        href={`mailto:${profile.email}`}
                        className="text-slate-800 hover:text-blue-600 transition-colors"
                      >
                        {profile.email}
                      </a>
                      <span className="text-green-500" title="Verified email">
                        ✓
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => copyToClipboard(profile.email, 'email')}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 rounded"
                    aria-label="Copy email to clipboard"
                  >
                    {copiedField === 'email' ? '✓' : '📋'}
                  </button>
                </div>
              )}
              
              <div className="flex items-center space-x-3">
                <span className="text-slate-600">🏢</span>
                <span className="text-slate-800">{profile.organization}</span>
              </div>
            </div>
          </div>

          {/* Research Preferences (including About) */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-800">Research Preferences</h2>
              <span className="text-xs text-slate-500">Last updated: Today</span>
            </div>
            
            <div className="space-y-4 text-left">
              {/* Research Area */}
              <div className="text-left">
                <h3 className="text-sm font-medium text-slate-600 mb-2 text-left">Research Area</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-600">🧬</span>
                  <span className="text-slate-800">{profile.research_area}</span>
                </div>
              </div>
              
              {/* Looking For / Sharing */}
              <div className="text-left">
                <h3 className="text-sm font-medium text-slate-600 mb-2 text-left">Looking For</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-600">{profile.seek_share === 'seek' ? '🔍' : '🤝'}</span>
                  <span className="text-slate-800">
                    {profile.seek_share === 'seek' ? 'Seeking Resources' : 'Sharing Resources'}
                  </span>
                </div>
              </div>
              
              {/* Profile Status */}
              <div className="text-left">
                <h3 className="text-sm font-medium text-slate-600 mb-2 text-left">Profile Status</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-600">{profile.status === 'active' ? '✅' : '⏸️'}</span>
                  <span className={`text-slate-800 ${profile.status === 'active' ? 'text-green-700' : 'text-orange-700'}`}>
                    {profile.status === 'active' ? 'Active - Visible in matches' : 'Inactive - Hidden from matches'}
                  </span>
                </div>
              </div>
              
              {/* Resource Types */}
              <div className="text-left">
                <h3 className="text-sm font-medium text-slate-600 mb-2 text-left">Resource Types</h3>
                <div className="flex items-center space-x-3">
                  <span className="text-slate-600">📚</span>
                  <div className="flex flex-wrap gap-2">
                    {formatResourceTypes(profile.resource_type).map((type, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-sm"
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Brief Description */}
              <div className="text-left">
                <h3 className="text-sm font-medium text-slate-600 mb-2 text-left">Brief Description of your work</h3>
                <div className="flex items-start space-x-3">
                  <span className="text-slate-600 mt-1">📝</span>
                  <p className="text-slate-700 leading-relaxed">
                    {profile.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Proof of Work Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">Proof of Work</h2>
              <span className="text-sm text-slate-500">Last updated: Today</span>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Research Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="text-left">
                  <h3 className="text-sm font-medium text-slate-600 mb-2">H-Index</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-600">📊</span>
                    <span className="text-lg font-semibold text-slate-800">
                      {profile.h_index || 'Not provided'}
                    </span>
                  </div>
                </div>
                
                <div className="text-left">
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Total Citations</h3>
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-600">📈</span>
                    <span className="text-lg font-semibold text-slate-800">
                      {profile.citations || 'Not provided'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Funding Summary */}
              {profile.funding_summary && (
                <div className="text-left">
                  <h3 className="text-sm font-medium text-slate-600 mb-2">Funding Summary</h3>
                  <div className="flex items-start space-x-3">
                    <span className="text-slate-600 mt-1">💰</span>
                    <p className="text-slate-700 leading-relaxed">
                      {profile.funding_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Publications */}
              {profile.publications && profile.publications.length > 0 && (
                <div className="text-left">
                  <h3 className="text-sm font-medium text-slate-600 mb-3">Recent Publications</h3>
                  <div className="space-y-3">
                    {profile.publications.slice(0, 3).map((pub, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50 rounded-lg">
                        <span className="text-slate-600 mt-1">📄</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-800 text-sm">{pub.title}</h4>
                          {pub.journal && (
                            <p className="text-sm text-slate-600 mt-1">
                              <span className="font-medium">{pub.journal}</span>
                              {pub.year && <span> ({pub.year})</span>}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {profile.publications.length > 3 && (
                      <p className="text-sm text-slate-500 text-center">
                        +{profile.publications.length - 3} more publications
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Profile Completion Prompt for new users */}
              {(!profile.h_index && !profile.citations && !profile.funding_summary && (!profile.publications || profile.publications.length === 0)) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <span className="text-blue-600 mt-1">💡</span>
                    <div>
                      <h4 className="font-medium text-blue-800 mb-1">Complete Your Profile</h4>
                      <p className="text-sm text-blue-700 mb-3">
                        Add your research metrics and publications to build trust with potential collaborators.
                      </p>
                      <button
                        onClick={() => setEditing(true)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Add Proof of Work
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Sticky Mobile CTA */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
        <button
          onClick={handleFindMatches}
          className="w-full px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          🔍 Find Matches
        </button>
      </div>

      {/* Edit Modal/Overlay */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Edit Profile</h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                />
              </div>

              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Organization
                </label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                />
              </div>

              {/* Seek/Share */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Intent
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="seek_share"
                      value="seek"
                      checked={formData.seek_share === 'seek'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Seeking Resources
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="seek_share"
                      value="share"
                      checked={formData.seek_share === 'share'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    Sharing Resources
                  </label>
                </div>
              </div>

              {/* Profile Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Profile Status
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="active"
                      checked={formData.status === 'active'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="flex items-center">
                      <span className="mr-2">✅</span>
                      Active - Visible in matches
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="status"
                      value="inactive"
                      checked={formData.status === 'inactive'}
                      onChange={handleInputChange}
                      className="mr-2"
                    />
                    <span className="flex items-center">
                      <span className="mr-2">⏸️</span>
                      Inactive - Hidden from matches
                    </span>
                  </label>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  When inactive, your profile won't appear in other users' search results
                </p>
              </div>

              {/* Resource Types */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Resource Types
                </label>
                <div className="space-y-2">
                  {['collaboration', 'expertise', 'mentorship', 'grants', 'equipment', 'data', 'other'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        name="resource_type"
                        value={type}
                        checked={Array.isArray(formData.resource_type) && formData.resource_type.includes(type)}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>
                
                {Array.isArray(formData.resource_type) && formData.resource_type.includes('other') && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={customResourceType}
                      onChange={(e) => setCustomResourceType(e.target.value)}
                      placeholder="Enter custom resource type"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Research Area */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Research Area
                </label>
                <input
                  type="text"
                  name="research_area"
                  value={formData.research_area || ''}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                />
              </div>

              {/* Proof of Work Section */}
              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-lg font-medium text-slate-800 mb-4">Proof of Work (Optional)</h3>
                
                {/* Research Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      H-Index
                    </label>
                    <input
                      type="number"
                      name="h_index"
                      value={formData.h_index || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., 25"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Total Citations
                    </label>
                    <input
                      type="number"
                      name="citations"
                      value={formData.citations || ''}
                      onChange={handleInputChange}
                      placeholder="e.g., 1250"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                    />
                  </div>
                </div>

                {/* Funding Summary */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Funding Summary
                  </label>
                  <textarea
                    name="funding_summary"
                    value={formData.funding_summary || ''}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Brief summary of your current and past funding (grants, awards, etc.)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none"
                  />
                </div>

                {/* Publications Note */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 mt-0.5">📄</span>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Publications</p>
                      <p className="text-xs text-blue-700 mt-1">
                        Publication management will be available in a future update. For now, your existing publications are displayed from your profile data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-200 flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
