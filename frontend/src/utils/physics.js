export const checkVertexCollision = (ball, vertex) => {
  const dx = ball.x - vertex.x;
  const dy = ball.y - vertex.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < ball.radius + 5;
};

export const checkEdgeCollision = (ball, shape) => {
  if (shape.type === 'rectangle') {
    return checkRectCollision(ball, shape);
  } else if (shape.type === 'triangle') {
    return checkTriangleCollision(ball, shape);
  }
  return { hit: false };
};

const checkRectCollision = (ball, rect) => {
  const cos = Math.cos(rect.rotation * Math.PI / 180);
  const sin = Math.sin(rect.rotation * Math.PI / 180);
  
  // Transform ball position to rectangle's local space
  const localX = (ball.x - rect.x) * cos + (ball.y - rect.y) * sin;
  const localY = -(ball.x - rect.x) * sin + (ball.y - rect.y) * cos;
  
  const hw = rect.width / 2;
  const hh = rect.height / 2;
  
  // Find closest point on rectangle
  const closestX = Math.max(-hw, Math.min(hw, localX));
  const closestY = Math.max(-hh, Math.min(hh, localY));
  
  const dx = localX - closestX;
  const dy = localY - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < ball.radius) {
    // Transform normal back to world space
    const normalX = (dx / distance) * cos - (dy / distance) * sin;
    const normalY = (dx / distance) * sin + (dy / distance) * cos;
    
    return {
      hit: true,
      normal: { x: normalX, y: normalY },
      depth: ball.radius - distance
    };
  }
  
  return { hit: false };
};

const checkTriangleCollision = (ball, tri) => {
  const cos = Math.cos(tri.rotation * Math.PI / 180);
  const sin = Math.sin(tri.rotation * Math.PI / 180);
  
  // Get rotated triangle points
  const rotatedPoints = tri.points.map(p => {
    const dx = p.x - tri.cx;
    const dy = p.y - tri.cy;
    return {
      x: tri.cx + (dx * cos - dy * sin),
      y: tri.cy + (dx * sin + dy * cos)
    };
  });
  
  // Check each edge
  for (let i = 0; i < 3; i++) {
    const p1 = rotatedPoints[i];
    const p2 = rotatedPoints[(i + 1) % 3];
    
    const edgeX = p2.x - p1.x;
    const edgeY = p2.y - p1.y;
    const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);
    
    const toBallX = ball.x - p1.x;
    const toBallY = ball.y - p1.y;
    
    const t = Math.max(0, Math.min(1, (toBallX * edgeX + toBallY * edgeY) / (edgeLen * edgeLen)));
    
    const closestX = p1.x + t * edgeX;
    const closestY = p1.y + t * edgeY;
    
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < ball.radius) {
      return {
        hit: true,
        normal: { x: dx / distance, y: dy / distance },
        depth: ball.radius - distance
      };
    }
  }
  
  return { hit: false };
};

export const resolveCollision = (ball, collision) => {
  if (!collision.hit) return;
  
  const { normal, depth } = collision;
  
  // Move ball out of collision
  ball.x += normal.x * depth;
  ball.y += normal.y * depth;
  
  // Reflect velocity
  const dot = ball.vx * normal.x + ball.vy * normal.y;
  ball.vx -= 2 * dot * normal.x;
  ball.vy -= 2 * dot * normal.y;
  
  // Apply damping
  ball.vx *= 0.8;
  ball.vy *= 0.8;
};

export const applyGravity = (ball, gravity = 0.5) => {
  ball.vy += gravity;
};

export const checkWallCollision = (ball, width, height) => {
  let collided = false;
  
  if (ball.x - ball.radius < 0) {
    ball.x = ball.radius;
    ball.vx *= -0.8;
    collided = true;
  }
  if (ball.x + ball.radius > width) {
    ball.x = width - ball.radius;
    ball.vx *= -0.8;
    collided = true;
  }
  if (ball.y - ball.radius < 0) {
    ball.y = ball.radius;
    ball.vy *= -0.8;
    collided = true;
  }
  if (ball.y + ball.radius > height) {
    ball.y = height - ball.radius;
    ball.vy *= -0.8;
    ball.vx *= 0.95;
    collided = true;
  }
  
  return collided;
};