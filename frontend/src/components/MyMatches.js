import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getApiUrl, API_ENDPOINTS } from '../config/api';

const MyMatches = () => {
  const navigate = useNavigate();
  const { logout, getAuthHeaders } = useAuth();
  const [savedMatches, setSavedMatches] = useState([]);
  const [filteredMatches, setFilteredMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const [deletingMatch, setDeletingMatch] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

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
    fetchSavedMatches();
  }, []);

  useEffect(() => {
    // Filter matches based on search query
    if (searchQuery.trim() === '') {
      setFilteredMatches(savedMatches);
    } else {
      const filtered = savedMatches.filter(match => 
        match.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.organization?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.research_area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredMatches(filtered);
    }
  }, [searchQuery, savedMatches]);

  const fetchSavedMatches = async () => {
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.SAVED_MATCHES), {
        method: 'GET',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        const matches = await response.json();
        setSavedMatches(matches);
        setFilteredMatches(matches);
      } else {
        console.error('Failed to fetch saved matches');
        alert('Failed to load saved matches');
      }
    } catch (error) {
      console.error('Error fetching saved matches:', error);
      alert('Failed to load saved matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMatch = async (profileId, index) => {
    if (!window.confirm('Are you sure you want to delete this match?')) {
      return;
    }
    
    setDeletingMatch(index);
    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.DELETE_SAVED_MATCH(profileId)), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (response.ok) {
        // Remove the match from both states
        setSavedMatches(prevMatches => prevMatches.filter((_, i) => i !== index));
        setFilteredMatches(prevMatches => prevMatches.filter((_, i) => i !== index));
      } else {
        console.error('Failed to delete match');
        alert('Failed to delete match. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting match:', error);
      alert('Failed to delete match. Please try again.');
    } finally {
      setDeletingMatch(null);
    }
  };

  const toggleDescription = (index) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const truncateText = (text, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getMatchScore = (match) => {
    // Return the stored match score string (e.g., "85%")
    if (match.match_score && match.match_score !== null) {
      return match.match_score;
    }
    // Fallback if no match score available
    return '85%';
  };

  const handleBackToSearch = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        backgroundColor: '#f8f9fa'
      }}>
        Loading your matches...
      </div>
    );
  }

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
              style={{
                background: 'none',
                border: 'none',
                color: '#1a73e8',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '8px 0',
                fontWeight: '500'
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
            My Matches
          </h2>
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: '#5f6368'
          }}>
            Browse and manage your research matches
          </p>
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
              placeholder="Search matches by name, organization, or research area..."
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

        {/* Matches List */}
        {filteredMatches.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '64px 32px',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px solid #e8eaed'
          }}>
            {savedMatches.length === 0 ? (
              <>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '20px',
                  fontWeight: '400',
                  color: '#202124'
                }}>
                  No saved matches yet
                </h3>
                <p style={{
                  margin: '0 0 24px 0',
                  color: '#5f6368',
                  fontSize: '16px'
                }}>
                  Start searching to find and save matches!
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
                  Start Searching
                </button>
              </>
            ) : (
              <>
                <h3 style={{
                  margin: '0 0 16px 0',
                  fontSize: '20px',
                  fontWeight: '400',
                  color: '#202124'
                }}>
                  No matches found
                </h3>
                <p style={{
                  margin: 0,
                  color: '#5f6368',
                  fontSize: '16px'
                }}>
                  Try adjusting your search terms
                </p>
              </>
            )}
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {filteredMatches.map((match, index) => {
              const isExpanded = expandedDescriptions[index];
              const isDeleting = deletingMatch === index;
              const matchScore = getMatchScore(match);
              
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
                        <span style={{
                          color: '#ea4335',
                          fontSize: '12px'
                        }}>
                          ♥ Bookmarked
                        </span>
                      </div>
                      <p style={{
                        margin: '0 0 8px 0',
                        color: '#5f6368',
                        fontSize: '14px',
                        textAlign: 'left'
                      }}>
                        {match.organization || 'MIT'}
                      </p>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        {(match.research_area || 'Machine Learning, Collaborative').split(',').map((area, i) => (
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
                    <button
                      onClick={() => handleDeleteMatch(match.id, index)}
                      disabled={isDeleting}
                      style={{
                        padding: '8px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontSize: '16px',
                        color: '#5f6368',
                        borderRadius: '4px'
                      }}
                      title="Delete match"
                    >
                      {isDeleting ? '⏳' : '🗑️'}
                    </button>
                  </div>

                  <div style={{
                    marginBottom: '16px'
                  }}>
                    <p style={{ margin: '0 0 16px 0', color: '#5f6368', fontSize: '14px', lineHeight: '1.5', textAlign: 'left' }}>
                      {expandedDescriptions[index] 
                        ? getCleanDescription(match)
                        : truncateText(getCleanDescription(match))
                      }
                    </p>
                    {getCleanDescription(match).length > 150 && (
                      <button
                        onClick={() => toggleDescription(index)}
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
                        {isExpanded ? 'View less' : 'View more'}
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
                        onClick={() => navigate(`/view-profile/${match.id}`)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#1a73e8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        View Full Profile
                      </button>
                      <button
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'white',
                          color: '#1a73e8',
                          border: '1px solid #dadce0',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyMatches;
