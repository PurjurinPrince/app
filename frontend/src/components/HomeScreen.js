import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const HomeScreen = ({ API }) => {
  const [progress, setProgress] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API}/progress`);
      const progressMap = {};
      response.data.forEach(p => {
        progressMap[p.level] = p;
      });
      setProgress(progressMap);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const getLevelClass = (level) => {
    const p = progress[level];
    if (!p || !p.completed) return '';
    if (p.stars === 3) return 'completed-1'; // Gold
    if (p.stars === 2) return 'completed-2'; // Darker yellow
    if (p.stars === 1) return 'completed-3'; // Light yellow
    return '';
  };

  const renderStars = (level) => {
    const p = progress[level];
    const stars = p?.stars || 0;
    return (
      <div className="stars-container">
        {[1, 2, 3].map(i => (
          <span key={i} className={`star ${i <= stars ? '' : 'empty'}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="home-screen" data-testid="home-screen">
      <h1 className="game-title" data-testid="game-title">BOUNCY BALL</h1>
      <p className="game-subtitle" data-testid="game-subtitle">Pop the ball on the vertices!</p>
      
      <div className="levels-grid" data-testid="levels-grid">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(level => (
          <button
            key={level}
            className={`level-button ${getLevelClass(level)}`}
            onClick={() => navigate(`/level/${level}`)}
            data-testid={`level-button-${level}`}
          >
            <div className="level-number">{level}</div>
            {renderStars(level)}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HomeScreen;