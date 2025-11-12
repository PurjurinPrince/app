import React, { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { levels } from '../utils/levels';
import { checkVertexCollision, checkEdgeCollision, resolveCollision, applyGravity, checkWallCollision } from '../utils/physics';
import { playSound } from '../utils/sounds';

// ============================================
// CONSTANTS
// ============================================
const MAX_ATTEMPTS = 4;
const MAX_VELOCITY = 40;
const GROUND_FRICTION = 0.985;
const GLOW_RADIUS = 21; // Reduced by 30% from 30

const GameCanvas = ({ API }) => {
  const canvasRef = useRef(null);
  const { levelNumber } = useParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState(0);
  const [message, setMessage] = useState('Pull back the ball and release!');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // win, retry
  const [earnedStars, setEarnedStars] = useState(0);
  
  const gameStateRef = useRef('ready'); // ready, pulling, playing, won
  const isFirstAttemptRef = useRef(true); // Track if this is the first attempt
  
  const gameRef = useRef({
    ball: { x: 0, y: 0, vx: 0, vy: 0, radius: 30, dragging: false },
    mouse: { x: 0, y: 0, down: false },
    globalMouse: { x: 0, y: 0 }, // Global mouse position (can be outside canvas)
    level: null,
    animationId: null,
    time: 0,
    dragStartX: 0,
    dragStartY: 0,
    onGround: false
  });

  useEffect(() => {
    const level = levels[parseInt(levelNumber) - 1];
    if (!level) {
      navigate('/');
      return;
    }
    
    gameRef.current.level = level;
    initGame();
    
    const handleKeyPress = (e) => {
      if (e.key === 'h' || e.key === 'H') {
        navigate('/');
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (gameRef.current.animationId) {
        cancelAnimationFrame(gameRef.current.animationId);
      }
    };
  }, [levelNumber]);

  // ============================================
  // INITIALIZATION
  // ============================================
  const initGame = (resetPosition = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const level = gameRef.current.level;
    
    // Only reset ball position on first load or explicit reset
    if (resetPosition || isFirstAttemptRef.current) {
      gameRef.current.ball = {
        x: level.ballStart.x,
        y: level.ballStart.y,
        vx: 0,
        vy: 0,
        radius: 30,
        dragging: false,
        startX: level.ballStart.x,
        startY: level.ballStart.y
      };
      isFirstAttemptRef.current = true;
    } else {
      // Keep current position but reset velocities
      gameRef.current.ball.vx = 0;
      gameRef.current.ball.vy = 0;
      gameRef.current.ball.dragging = false;
    }
    
    gameRef.current.time = 0;
    gameRef.current.dragStartX = 0;
    gameRef.current.dragStartY = 0;
    gameRef.current.onGround = false;
    gameStateRef.current = 'ready';
    setMessage('Pull back the ball and release!');
    
    if (!gameRef.current.animationId) {
      gameLoop();
    }
  };

  const gameLoop = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const game = gameRef.current;
    const level = game.level;
    const currentState = gameStateRef.current;
    
    game.time += 0.016;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 1366, 768);
    
    // Update level-specific animations
    if (level.update) {
      level.update(game.time);
    }
    
    // Draw shapes
    level.shapes.forEach(shape => {
      if (shape.type === 'rectangle') {
        ctx.save();
        ctx.translate(shape.x, shape.y);
        ctx.rotate((shape.rotation || 0) * Math.PI / 180);
        ctx.fillStyle = shape.color;
        ctx.fillRect(-shape.width / 2, -shape.height / 2, shape.width, shape.height);
        ctx.restore();
      } else if (shape.type === 'triangle') {
        ctx.save();
        ctx.translate(shape.cx, shape.cy);
        ctx.rotate((shape.rotation || 0) * Math.PI / 180);
        ctx.fillStyle = shape.color;
        ctx.beginPath();
        shape.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x - shape.cx, p.y - shape.cy);
          else ctx.lineTo(p.x - shape.cx, p.y - shape.cy);
        });
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    });
    
    // Update and draw ball
    const ball = game.ball;
    
    if (currentState === 'playing') {
      // Apply gravity
      const gravity = level.gravity || 0.5;
      ball.vy += gravity;
      
      // Update position
      ball.x += ball.vx;
      ball.y += ball.vy;
      
      // Wall collisions
      const hasWalls = level.hasWalls !== false;
      if (hasWalls) {
        if (ball.x - ball.radius < 0) {
          ball.x = ball.radius;
          ball.vx *= -0.8;
        }
        if (ball.x + ball.radius > 1366) {
          ball.x = 1366 - ball.radius;
          ball.vx *= -0.8;
        }
      } else {
        // Wrap around for level 3
        if (ball.x < 0) ball.x = 1366;
        if (ball.x > 1366) ball.x = 0;
      }
      
      if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -0.8;
      }
      if (ball.y + ball.radius > 768) {
        ball.y = 768 - ball.radius;
        ball.vy *= -0.8;
        ball.vx *= 0.95;
      }
      
      // Check collisions with shapes
      level.shapes.forEach(shape => {
        if (shape.type === 'rectangle') {
          const collision = checkEdgeCollision(ball, shape);
          if (collision.hit) {
            if (shape.special === 'spinner') {
              // Spinner hits the ball like a bat
              const angle = Math.random() * Math.PI * 2;
              const speed = 15;
              ball.vx = Math.cos(angle) * speed;
              ball.vy = Math.sin(angle) * speed;
              playSound('bounce');
            } else if (shape.special === 'jelly') {
              // Jelly bounce
              ball.vx = -ball.vx * 1.2;
              ball.vy = -ball.vy * 1.2;
              playSound('bounce');
            } else if (shape.special === 'bouncy') {
              // Bouncy pad - reflect with extra bounce
              const dx = ball.x - shape.x;
              const dy = ball.y - shape.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              ball.vx = (dx / dist) * 20;
              ball.vy = (dy / dist) * 20;
              playSound('bounce');
            } else if (shape.special === 'movable') {
              // Push the shape
              shape.vx = ball.vx * 0.3;
              shape.vy = ball.vy * 0.3;
              shape.angularVel = (ball.vx * 0.05);
              resolveCollision(ball, collision);
            } else if (!shape.special || shape.special !== 'barrier') {
              resolveCollision(ball, collision);
            }
          }
        } else if (shape.type === 'triangle') {
          const collision = checkEdgeCollision(ball, shape);
          if (collision.hit) {
            if (shape.special === 'bouncy') {
              // Bouncy triangle
              const dx = ball.x - shape.cx;
              const dy = ball.y - shape.cy;
              const dist = Math.sqrt(dx * dx + dy * dy);
              ball.vx = (dx / dist) * 20;
              ball.vy = (dy / dist) * 20;
              playSound('bounce');
            } else if (shape.special === 'movable') {
              shape.vx = ball.vx * 0.3;
              shape.vy = ball.vy * 0.3;
              shape.angularVel = (ball.vx * 0.05);
              resolveCollision(ball, collision);
            } else {
              resolveCollision(ball, collision);
            }
          }
        }
      });
      
      // Check vertex collisions for win condition
      if (!level.noVertexPop && gameStateRef.current === 'playing') {
        level.shapes.forEach(shape => {
          if (shape.canPop !== false) {
            const vertices = shape.type === 'rectangle' ? getRectVertices(shape) : shape.points;
            vertices.forEach(vertex => {
              const inCanvas = vertex.x >= 0 && vertex.x <= 1366 && vertex.y >= 0 && vertex.y <= 768;
              if (inCanvas && checkVertexCollision(ball, vertex)) {
                winLevel();
              }
            });
          }
        });
      }
      
      // Stop if ball is too slow and on ground
      if (Math.abs(ball.vx) < 0.5 && Math.abs(ball.vy) < 0.5 && ball.y > 700) {
        gameStateRef.current = 'ready';
        ball.x = ball.startX;
        ball.y = ball.startY;
        ball.vx = 0;
        ball.vy = 0;
        setMessage('Try again! Pull back the ball.');
      }
    }
    
    // Draw ball
    ctx.save();
    if (ball.dragging && currentState === 'pulling') {
      // Yellow glow when pulling
      ctx.shadowColor = '#ffff00';
      ctx.shadowBlur = 30;
    }
    ctx.fillStyle = '#ff6b35';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    
    // Draw pull indicator
    if (ball.dragging && currentState === 'pulling') {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(ball.x, ball.y);
      ctx.lineTo(game.mouse.x, game.mouse.y);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw arrow at pull direction
      const dx = ball.x - game.mouse.x;
      const dy = ball.y - game.mouse.y;
      const angle = Math.atan2(dy, dx);
      const arrowLen = 20;
      ctx.beginPath();
      ctx.moveTo(game.mouse.x, game.mouse.y);
      ctx.lineTo(
        game.mouse.x + Math.cos(angle + 0.5) * arrowLen,
        game.mouse.y + Math.sin(angle + 0.5) * arrowLen
      );
      ctx.moveTo(game.mouse.x, game.mouse.y);
      ctx.lineTo(
        game.mouse.x + Math.cos(angle - 0.5) * arrowLen,
        game.mouse.y + Math.sin(angle - 0.5) * arrowLen
      );
      ctx.stroke();
    }
    
    game.animationId = requestAnimationFrame(gameLoop);
  };

  const getRectVertices = (rect) => {
    const cos = Math.cos(rect.rotation * Math.PI / 180);
    const sin = Math.sin(rect.rotation * Math.PI / 180);
    const hw = rect.width / 2;
    const hh = rect.height / 2;
    
    return [
      { x: rect.x + (-hw * cos - -hh * sin), y: rect.y + (-hw * sin + -hh * cos) },
      { x: rect.x + (hw * cos - -hh * sin), y: rect.y + (hw * sin + -hh * cos) },
      { x: rect.x + (hw * cos - hh * sin), y: rect.y + (hw * sin + hh * cos) },
      { x: rect.x + (-hw * cos - hh * sin), y: rect.y + (-hw * sin + hh * cos) }
    ];
  };

  const winLevel = () => {
    if (gameStateRef.current === 'won') return; // Prevent multiple wins
    
    playSound('pop');
    gameStateRef.current = 'won';
    
    const newAttempts = attempts + 1;
    let stars = 0;
    if (newAttempts === 1) stars = 3;
    else if (newAttempts === 2) stars = 2;
    else if (newAttempts === 3) stars = 1;
    
    setEarnedStars(stars);
    
    // Save progress
    saveProgress(stars, newAttempts, stars > 0);
    
    if (stars > 0) {
      setModalType('win');
    } else {
      setModalType('retry');
    }
    setShowModal(true);
    
    // Hide ball
    gameRef.current.ball.x = -1000;
    gameRef.current.ball.y = -1000;
  };

  const saveProgress = async (stars, attemptCount, completed) => {
    try {
      await axios.post(`${API}/progress`, {
        level: parseInt(levelNumber),
        stars,
        attempts: attemptCount,
        completed
      });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const handleMouseDown = (e) => {
    if (gameStateRef.current !== 'ready') return;
    
    const { x, y } = getCanvasCoordinates(e);
    const ball = gameRef.current.ball;
    const dx = x - ball.x;
    const dy = y - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < ball.radius + 10) {
      ball.dragging = true;
      gameRef.current.dragStartX = ball.x;
      gameRef.current.dragStartY = ball.y;
      gameRef.current.mouse = { x, y, down: true };
      gameStateRef.current = 'pulling';
      playSound('stretch');
    }
  };

  const handleMouseMove = (e) => {
    const { x, y } = getCanvasCoordinates(e);
    gameRef.current.mouse = { ...gameRef.current.mouse, x, y };
  };

  const handleMouseUp = (e) => {
    const ball = gameRef.current.ball;
    const game = gameRef.current;
    
    if (!ball.dragging || gameStateRef.current !== 'pulling') return;
    
    ball.dragging = false;
    gameRef.current.mouse.down = false;
    
    // Calculate launch velocity - opposite direction from pull
    const dx = game.dragStartX - game.mouse.x;
    const dy = game.dragStartY - game.mouse.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(distance / 15, 25); // Max velocity of 25
    
    if (distance > 5) { // Minimum pull distance
      const angle = Math.atan2(dy, dx);
      
      ball.vx = Math.cos(angle) * power;
      ball.vy = Math.sin(angle) * power;
      
      playSound('snap');
      gameStateRef.current = 'playing';
      setAttempts(prev => prev + 1);
      setMessage('Go!');
    } else {
      // Not enough pull, reset
      gameStateRef.current = 'ready';
      setMessage('Pull back the ball and release!');
    }
  };

  const handleRetry = () => {
    setShowModal(false);
    setAttempts(0);
    gameStateRef.current = 'ready';
    initGame();
  };

  const handleNextLevel = () => {
    const next = parseInt(levelNumber) + 1;
    if (next <= 8) {
      setShowModal(false);
      setAttempts(0);
      gameStateRef.current = 'ready';
      navigate(`/level/${next}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="game-container" data-testid="game-container">
      <div className="game-header" data-testid="game-header">
        <div className="level-info" data-testid="level-info">Level {levelNumber}</div>
        <div className="attempts-info" data-testid="attempts-info">Attempts: {attempts}</div>
        <div className="home-hint" data-testid="home-hint">Press H to open Home screen</div>
      </div>
      
      <canvas
        ref={canvasRef}
        className="game-canvas"
        width={1366}
        height={768}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        data-testid="game-canvas"
      />
      
      <div className="game-message" data-testid="game-message">{message}</div>
      
      {showModal && (
        <div className="modal-overlay" data-testid="modal-overlay">
          <div className="modal-content" data-testid="modal-content">
            <h2 className={`modal-title ${modalType}`} data-testid="modal-title">
              {modalType === 'win' ? 'Level Complete!' : 'RETRY'}
            </h2>
            
            {modalType === 'win' && (
              <div className="modal-stars" data-testid="modal-stars">
                {[1, 2, 3].map(i => (
                  <span key={i} style={{ color: i <= earnedStars ? '#ffd700' : '#333' }}>
                    ★
                  </span>
                ))}
              </div>
            )}
            
            <p className="modal-message" data-testid="modal-message">
              {modalType === 'win' 
                ? `You completed this level in ${attempts} attempt${attempts !== 1 ? 's' : ''}!`
                : 'You\'ve used all your attempts. Try again!'}
            </p>
            
            <div className="modal-buttons" data-testid="modal-buttons">
              <button className="modal-button" onClick={() => navigate('/')} data-testid="modal-home-btn">
                Home
              </button>
              <button className="modal-button" onClick={handleRetry} data-testid="modal-retry-btn">
                Retry
              </button>
              {modalType === 'win' && (
                <button className="modal-button primary" onClick={handleNextLevel} data-testid="modal-next-btn">
                  {parseInt(levelNumber) < 8 ? 'Next Level' : 'Finish'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameCanvas;