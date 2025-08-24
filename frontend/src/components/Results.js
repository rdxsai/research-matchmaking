import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const Results = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, getAuthHeaders } = useAuth();
  const { matches, formData } = location.state || { matches: [], formData: {} };
  const [savedMatches, setSavedMatches] = useState(new Set());
  const [savingMatch, setSavingMatch] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [organizationFilter, setOrganizationFilter] = useState([]);
  const [expandedCards, setExpandedCards] = useState({});
  const [selectedOrganizations, setSelectedOrganizations] = useState([]);

  // Function to clean description text and remove research area duplication
  const getCleanDescription = (match) => {
    let description = match.description || match.primary_text || '';
    
    // If using primary_text (older profiles), remove research area prefix
    if (!match.description && match.primary_text && match.research_area) {
      // Remove research area from the beginning of primary_text
      const researchArea = match.research_area.trim();
      if (description.startsWith(researchArea)) {
        description = description.substring(researchArea.length).trim();
        // Remove any leading punctuation or whitespace
        description = description.replace(/^[,\s]+/, '');
      }
    }
    
    return description || 'No description available.';
  };

  useEffect(() => {
    // Initialize filtered matches with all matches
    setFilteredMatches(matches);
  }, [matches]);

  useEffect(() => {
    // Filter matches based on search query and organization filters
    let filtered = matches;
    
    // Apply search query filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(match => 
        match.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.research_area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply organization filter
    if (selectedOrganizations.length > 0) {
      filtered = filtered.filter(match => 
        selectedOrganizations.includes(match.organization)
      );
    }
    
    setFilteredMatches(filtered);
  }, [searchQuery, matches, selectedOrganizations]);
  
  // Use the same organization options as registration form
  const organizationOptions = [
    'Carilion Clinic - Department of Medicine',
    'Virginia Tech',
    'Virginia Tech - FBRI'
  ];
  
  // Filter organization options to only show those that have matches in current results
  const availableOrganizations = organizationOptions.filter(org => 
    matches.some(match => match.organization === org)
  );
  
  const handleOrganizationFilter = (organization) => {
    setSelectedOrganizations(prev => 
      prev.includes(organization) 
        ? prev.filter(org => org !== organization)
        : [...prev, organization]
    );
  };
  
  const clearAllFilters = () => {
    setSelectedOrganizations([]);
    setSearchQuery('');
  };

  const toggleCardExpansion = (index) => {
    setExpandedCards(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveMatch = async (profileId, index) => {
    setSavingMatch(index);
    try {
      // Get the match score from the current match
      const currentMatch = filteredMatches[index];
      const matchScore = currentMatch.match_score ? Math.round(currentMatch.match_score * 100) + '%' : null;
      
      // Create URL with match_score as query parameter
      const url = new URL(getApiUrl(API_ENDPOINTS.SAVE_MATCH(profileId)), window.location.origin);
      if (matchScore) {
        url.searchParams.append('match_score', matchScore);
      }
      
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        setSavedMatches(prev => new Set([...prev, profileId]));
        alert('Match saved successfully!');
      } else {
        const errorData = await response.json();
        alert(errorData.detail || 'Failed to save match');
      }
    } catch (error) {
      console.error('Error saving match:', error);
      alert('Failed to save match. Please try again.');
    } finally {
      setSavingMatch(null);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: '1px solid #e9ecef',
        padding: '16px 24px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#4285f4',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold'
            }}>
              RM
            </div>
            <h1 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '500',
              color: '#202124'
            }}>
              ResearchMatch
            </h1>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px'
          }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: '#5f6368',
                cursor: 'pointer',
                fontSize: '14px',
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
                color: '#5f6368',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '8px 0'
              }}
            >
              My Matches
            </button>
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'none',
                border: 'none',
                color: '#5f6368',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '8px 0'
              }}
            >
              Profile
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '32px 24px'
      }}>
        {/* Back to Dashboard Button */}
        <div style={{
          marginBottom: '24px'
        }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none',
              border: 'none',
              color: '#1a73e8',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0'
            }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Page Title and Description */}
        <div style={{
          marginBottom: '32px'
        }}>
          <h2 style={{
            margin: '0 0 8px 0',
            fontSize: '32px',
            fontWeight: '400',
            color: '#202124'
          }}>
            Search Results
          </h2>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: '#5f6368'
          }}>
            Found {filteredMatches.length} researcher{filteredMatches.length !== 1 ? 's' : ''} matching your criteria
          </p>
        </div>

        {/* Search Criteria Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e8eaed',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '16px',
              fontWeight: '500',
              color: '#202124'
            }}>
              🔍 Search Criteria
            </span>
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            {/* Display actual search intent */}
            {formData?.seek_share && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#e8f0fe',
                color: '#1a73e8',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {formData.seek_share === 'seek' ? 'Seeking Resources' : 'Sharing Resources'}
              </div>
            )}
            
            {/* Display actual resource types */}
            {formData?.resource_type && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f1f3f4',
                color: '#5f6368',
                borderRadius: '16px',
                fontSize: '14px'
              }}>
                {Array.isArray(formData.resource_type) 
                  ? formData.resource_type.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ')
                  : formData.resource_type.charAt(0).toUpperCase() + formData.resource_type.slice(1)
                }
              </div>
            )}
            
            {/* Display actual query/description */}
            {formData?.query && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f1f3f4',
                color: '#5f6368',
                borderRadius: '16px',
                fontSize: '14px',
                maxWidth: '300px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                "{formData.query}"
              </div>
            )}
            
            {/* Fallback if no formData */}
            {!formData?.seek_share && !formData?.resource_type && !formData?.query && (
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f1f3f4',
                color: '#5f6368',
                borderRadius: '16px',
                fontSize: '14px'
              }}>
                General Search
              </div>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div style={{
          marginBottom: '32px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            flex: 1,
            position: 'relative'
          }}>
            <input
              type="text"
              placeholder="Search within results..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #dadce0',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '12px 16px',
              border: '1px solid #dadce0',
              borderRadius: '8px',
              backgroundColor: 'white',
              color: '#5f6368',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            🔍 Filters
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #dadce0',
            borderRadius: '8px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '500',
                color: '#202124'
              }}>Filter by Organization</h3>
              <button
                onClick={clearAllFilters}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #dadce0',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#5f6368',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Clear All
              </button>
            </div>
            
            {/* Organization Filter */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {availableOrganizations.map(org => (
                <label key={org} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#5f6368'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedOrganizations.includes(org)}
                    onChange={() => handleOrganizationFilter(org)}
                    style={{
                      cursor: 'pointer'
                    }}
                  />
                  {org}
                </label>
              ))}
            </div>
            
            {/* Active Filters Display */}
            {selectedOrganizations.length > 0 && (
              <div style={{
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e8eaed'
              }}>
                <p style={{
                  margin: '0 0 8px 0',
                  fontSize: '12px',
                  color: '#5f6368',
                  fontWeight: '500'
                }}>Active Filters:</p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {selectedOrganizations.map(org => (
                    <span key={`org-${org}`} style={{
                      padding: '4px 8px',
                      backgroundColor: '#e8f0fe',
                      color: '#1a73e8',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {org}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Results Count */}
        <div style={{
          marginBottom: '16px'
        }}>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#5f6368'
          }}>
            📍 {filteredMatches.length} researchers found
          </p>
        </div>

        {/* Results List */}
        {filteredMatches.length > 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {filteredMatches.map((match, index) => {
              const isExpanded = expandedCards[index];
              const isSaved = savedMatches.has(match.id);
              const isSaving = savingMatch === index;
              const matchScore = match.match_score ? Math.round(match.match_score * 100) + '%' : '85%';

              return (
                <div
                  key={match.id || index}
                  style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #e8eaed',
                    padding: '24px',
                    transition: 'box-shadow 0.2s ease'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '16px'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px'
                      }}>
                        <h3 style={{
                          margin: 0,
                          fontSize: '18px',
                          fontWeight: '500',
                          color: '#202124'
                        }}>
                          {match.name || 'Dr. Sarah Johnson'}
                        </h3>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: '#e8f5e8',
                          color: '#137333',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {matchScore} match
                        </span>
                      </div>
                      <p style={{
                        margin: '0 0 8px 0',
                        color: '#5f6368',
                        fontSize: '14px',
                        textAlign: 'left'
                      }}>
                        {match.organization || 'MIT'} • {match.research_area ? `${match.research_area.split(',')[0].trim()} exp.` : 'Research experience'} • {match.resource_type || 'Publications'}
                      </p>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        {(match.research_area || 'Machine Learning, Collaboration').split(',').slice(0, 3).map((area, i) => (
                          <span
                            key={i}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: '#f1f3f4',
                              color: '#5f6368',
                              borderRadius: '4px',
                              fontSize: '12px'
                            }}
                          >
                            {area.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    marginBottom: '16px'
                  }}>
                    <p style={{
                      margin: '0 0 16px 0',
                      color: '#5f6368',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      textAlign: 'left'
                    }}>
                      {isExpanded 
                        ? getCleanDescription(match)
                        : getCleanDescription(match).substring(0, 150) + '...'
                      }
                    </p>
                    {getCleanDescription(match).length > 150 && (
                      <button
                        onClick={() => toggleCardExpansion(index)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#1a73e8',
                          cursor: 'pointer',
                          fontSize: '14px',
                          padding: '4px 0',
                          marginTop: '8px'
                        }}
                      >
                        {isExpanded ? 'View less' : 'View More'}
                      </button>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '16px'
                    }}>

                      <button
                        onClick={() => handleSaveMatch(match.id, index)}
                        disabled={isSaved || isSaving}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: isSaved ? '#e8f5e8' : (isSaving ? '#f1f3f4' : '#34a853'),
                          color: isSaved ? '#137333' : (isSaving ? '#5f6368' : 'white'),
                          border: 'none',
                          borderRadius: '6px',
                          cursor: isSaved || isSaving ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        {isSaved ? '✓ Saved' : isSaving ? 'Saving...' : 'Save Match'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            textAlign: 'center',
            padding: '64px 32px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e8eaed'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '20px',
              fontWeight: '400',
              color: '#202124'
            }}>
              No matches found
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#5f6368',
              fontSize: '16px'
            }}>
              Try adjusting your search terms or criteria
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                padding: '12px 24px',
                backgroundColor: '#1a73e8',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Try New Search
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
