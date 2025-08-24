import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const ViewProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl(API_ENDPOINTS.PROFILE_BY_ID(userId)), {
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      } else {
        setError('Failed to load profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const parseResourceTypes = (resourceTypeString) => {
    if (!resourceTypeString) return [];
    
    let resourceTypes = [];
    if (resourceTypeString.includes(', ')) {
      resourceTypes = resourceTypeString.split(', ').map(item => item.trim());
    } else if (resourceTypeString.includes(',')) {
      resourceTypes = resourceTypeString.split(',').map(item => item.trim());
    } else {
      resourceTypes = [resourceTypeString.trim()];
    }
    
    return resourceTypes.filter(type => type.length > 1);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getCleanDescription = (profile) => {
    let description = profile.description || '';
    
    // If description starts with research area, remove it (for older profiles)
    if (description && profile.research_area) {
      const researchArea = profile.research_area.trim();
      if (description.startsWith(researchArea)) {
        description = description.substring(researchArea.length).trim();
        description = description.replace(/^[,\s]+/, '');
      }
    }
    
    return description || 'No description available.';
  };

  const getResourceTypeColor = (type) => {
    const colors = {
      'collaboration': '#f59e0b',
      'expertise': '#10b981', 
      'mentorship': '#8b5cf6',
      'grants': '#ef4444',
      'equipment': '#3b82f6',
      'data': '#06b6d4'
    };
    return colors[type.toLowerCase()] || '#6b7280';
  };

  const getResourceTypeIcon = (type) => {
    const icons = {
      'collaboration': '🤝',
      'expertise': '🎯', 
      'mentorship': '👨‍🏫',
      'grants': '💰',
      'equipment': '🔬',
      'data': '📊'
    };
    return icons[type.toLowerCase()] || '📋';
  };

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #1f2937',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '400px', padding: '32px' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => navigate('/my-matches')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#1f2937',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Back to My Matches
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        backgroundColor: 'white',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Profile not found</p>
      </div>
    );
  }

  const resourceTypes = parseResourceTypes(profile.resource_type);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'white' }}>
      {/* Header Navigation */}
      <header style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 0'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#1f2937',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600'
            }}>
              RM
            </div>
            <span style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              ResearchMatch
            </span>
          </div>
          
          <nav style={{ display: 'flex', gap: '32px' }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '8px 0'
              }}
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/my-matches')}
              style={{
                background: 'none',
                border: 'none',
                color: '#1f2937',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '8px 0',
                fontWeight: '500'
              }}
            >
              My Matches
            </button>
          </nav>
          
          <div style={{
            width: '32px',
            height: '32px',
            backgroundColor: '#1f2937',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}>
            R
          </div>
        </div>
      </header>

      {/* Profile Content */}
      <main style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {/* Profile Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#1f2937',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: '600',
            color: 'white',
            flexShrink: 0
          }}>
            {getInitials(profile.name)}
          </div>
          
          <div style={{ flex: 1 }}>
            <h1 style={{
              margin: '0 0 8px 0',
              fontSize: '32px',
              fontWeight: '700',
              color: '#1f2937'
            }}>
              {profile.name}
            </h1>
            <p style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: '#6b7280'
            }}>
              {profile.organization}
            </p>
            
            {/* Resource Type Pills */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
                padding: '4px 12px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                <span>🤝</span>
                <span>{profile.seek_share === 'seek' ? 'Seeking' : 'Sharing'}</span>
              </div>
              
              {resourceTypes.slice(0, 3).map((type, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#dbeafe',
                    color: '#1e40af',
                    padding: '4px 12px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  <span>{getResourceTypeIcon(type)}</span>
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Information Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Contact Information
            </h2>
            <span style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Last updated: Today
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>📧</span>
              <span style={{
                fontSize: '16px',
                color: '#1f2937'
              }}>
                {profile.email}
              </span>
              <span style={{
                fontSize: '12px',
                color: '#10b981',
                backgroundColor: '#d1fae5',
                padding: '2px 8px',
                borderRadius: '12px'
              }}>
                ✓
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px' }}>🏢</span>
              <span style={{
                fontSize: '16px',
                color: '#1f2937'
              }}>
                {profile.organization}
              </span>
            </div>
          </div>
        </div>

        {/* Research Preferences Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              Research Preferences
            </h2>
            <span style={{
              fontSize: '14px',
              color: '#6b7280'
            }}>
              Last updated: Today
            </span>
          </div>

          {/* Research Area */}
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Research Area
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>🎯</span>
              <span style={{
                fontSize: '16px',
                color: '#1f2937'
              }}>
                {profile.research_area}
              </span>
            </div>
          </div>

          {/* Looking For */}
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Looking For
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>
                {profile.seek_share === 'seek' ? '🔍' : '🤝'}
              </span>
              <span style={{
                fontSize: '16px',
                color: '#1f2937'
              }}>
                {profile.seek_share === 'seek' ? 'Seeking Resources' : 'Sharing Resources'}
              </span>
            </div>
          </div>

          {/* Profile Status */}
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Profile Status
            </h3>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '16px' }}>
                {profile.status === 'active' ? '✅' : '⏸️'}
              </span>
              <span style={{
                fontSize: '16px',
                color: profile.status === 'active' ? '#059669' : '#d97706',
                fontWeight: '500'
              }}>
                {profile.status === 'active' ? 'Active - Visible in matches' : 'Inactive - Hidden from matches'}
              </span>
            </div>
          </div>

          {/* Resource Types */}
          <div style={{ marginBottom: '24px', textAlign: 'left' }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Resource Types
            </h3>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              {resourceTypes.map((type, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: getResourceTypeColor(type) + '20',
                    color: getResourceTypeColor(type),
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: `1px solid ${getResourceTypeColor(type)}40`
                  }}
                >
                  <span>{getResourceTypeIcon(type)}</span>
                  <span style={{ textTransform: 'capitalize' }}>{type}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Brief Description */}
          <div style={{ textAlign: 'left' }}>
            <h3 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '500',
              color: '#374151'
            }}>
              Brief Description of your work
            </h3>
            <p style={{
              margin: 0,
              fontSize: '16px',
              lineHeight: '1.6',
              color: '#374151'
            }}>
              {getCleanDescription(profile)}
            </p>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ViewProfile;
