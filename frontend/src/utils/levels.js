export const levels = [
  // Level 1
  {
    ballStart: { x: 100, y: 384 },
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 533, y: 768 },
          { x: 653, y: 558 },
          { x: 913, y: 648 }
        ],
        cx: 700,
        cy: 658,
        color: '#7d00c8',
        rotation: 0
      },
      {
        type: 'rectangle',
        x: 980,
        y: 260,
        width: 220,
        height: 220,
        rotation: 45,
        color: '#007dc8'
      }
    ]
  },
  
  // Level 2
  {
    ballStart: { x: 100, y: 384 },
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 833, y: 788 },
          { x: 1386, y: 324 },
          { x: 1386, y: 788 }
        ],
        cx: 1200,
        cy: 633,
        color: '#7d00c8',
        rotation: 0,
        canPop: false
      },
      {
        type: 'rectangle',
        x: 840,
        y: 230,
        width: 280,
        height: 120,
        rotation: 0,
        color: '#007dc8'
      }
    ]
  },
  
  // Level 3 - Wrap around level
  {
    ballStart: { x: 100, y: 384 },
    hasWalls: false,
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 870, y: 190 },
          { x: 1215, y: 260 },
          { x: 1020, y: 380 }
        ],
        cx: 1035,
        cy: 277,
        color: '#7d00c8',
        rotation: 0
      },
      {
        type: 'rectangle',
        x: 683,
        y: 384,
        width: 900,
        height: 120,
        rotation: 70,
        color: '#007dc8',
        canPop: false,
        special: 'barrier'
      }
    ]
  },
  
  // Level 4 - Spinning rectangle
  {
    ballStart: { x: 100, y: 384 },
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 943, y: 384 },
          { x: 1113, y: 314 },
          { x: 1113, y: 454 }
        ],
        cx: 1023,
        cy: 384,
        color: '#7d00c8',
        rotation: 0
      },
      {
        type: 'rectangle',
        x: 643,
        y: 384,
        width: 50,
        height: 380,
        rotation: 0,
        color: '#007dc8',
        canPop: false,
        special: 'spinner'
      }
    ],
    update: function(time) {
      this.shapes[1].rotation = (time * 120) % 360;
    }
  },
  
  // Level 5 - Spinning triangle and orbiting jelly
  {
    ballStart: { x: 100, y: 384 },
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 743, y: 414 },
          { x: 623, y: 414 },
          { x: 683, y: 324 }
        ],
        cx: 683,
        cy: 384,
        color: '#7d00c8',
        rotation: 0
      },
      {
        type: 'rectangle',
        x: 833,
        y: 234,
        width: 60,
        height: 120,
        rotation: 0,
        color: '#e13636',
        canPop: false,
        special: 'jelly'
      }
    ],
    update: function(time) {
      this.shapes[0].rotation = (time * 60) % 360;
      const angle = time * -60 * Math.PI / 180;
      this.shapes[1].x = 683 + Math.cos(angle) * 150;
      this.shapes[1].y = 384 + Math.sin(angle) * 150;
      this.shapes[1].rotation = (time * -60) % 360;
    }
  },
  
  // Level 6 - Teleporting shapes
  {
    ballStart: { x: 100, y: 384 },
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 600, y: 300 },
          { x: 670, y: 370 },
          { x: 530, y: 370 }
        ],
        cx: 600,
        cy: 347,
        color: '#7d00c8',
        rotation: 0
      },
      {
        type: 'rectangle',
        x: 800,
        y: 400,
        width: 130,
        height: 50,
        rotation: 0,
        color: '#007dc8'
      }
    ],
    update: function(time) {
      const teleportInterval = 1.5;
      if (Math.floor(time / teleportInterval) !== Math.floor((time - 0.016) / teleportInterval)) {
        // Teleport shapes
        const newX1 = 300 + Math.random() * 800;
        const newY1 = 200 + Math.random() * 400;
        const dx = newX1 - this.shapes[0].cx;
        const dy = newY1 - this.shapes[0].cy;
        this.shapes[0].points.forEach(p => {
          p.x += dx;
          p.y += dy;
        });
        this.shapes[0].cx = newX1;
        this.shapes[0].cy = newY1;
        
        this.shapes[1].x = 300 + Math.random() * 800;
        this.shapes[1].y = 200 + Math.random() * 400;
      }
    }
  },
  
  // Level 7 - Low gravity, movable shapes
  {
    ballStart: { x: 100, y: 384 },
    gravity: 0.08,
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 1133, y: 314 },
          { x: 953, y: 714 },
          { x: 1253, y: 614 }
        ],
        cx: 1113,
        cy: 547,
        color: '#7d00c8',
        rotation: 0,
        vx: 0,
        vy: 0,
        angularVel: 0,
        special: 'movable'
      },
      {
        type: 'rectangle',
        x: 533,
        y: 234,
        width: 250,
        height: 120,
        rotation: 75,
        color: '#007dc8',
        vx: 0,
        vy: 0,
        angularVel: 0,
        special: 'movable'
      }
    ],
    update: function(time) {
      this.shapes.forEach(shape => {
        if (shape.special === 'movable') {
          shape.x += shape.vx;
          shape.y += shape.vy;
          shape.rotation += shape.angularVel;
          shape.vx *= 0.99;
          shape.vy *= 0.99;
          shape.angularVel *= 0.98;
          
          if (shape.type === 'triangle') {
            const dx = shape.x - shape.cx;
            const dy = shape.y - shape.cy;
            shape.points.forEach(p => {
              p.x += dx;
              p.y += dy;
            });
            shape.cx = shape.x;
            shape.cy = shape.y;
          }
        }
      });
    }
  },
  
  // Level 8 - Bouncy triangle and barrier
  {
    ballStart: { x: 1150, y: 534 },
    shapes: [
      {
        type: 'triangle',
        points: [
          { x: 513, y: 264 },
          { x: 413, y: 868 },
          { x: 1153, y: 868 }
        ],
        cx: 693,
        cy: 667,
        color: '#7d00c8',
        rotation: 0,
        special: 'bouncy'
      },
      {
        type: 'rectangle',
        x: 1166,
        y: 408,
        width: 400,
        height: 30,
        rotation: 0,
        color: '#000',
        canPop: false,
        special: 'barrier'
      },
      {
        type: 'rectangle',
        x: 1043,
        y: 244,
        width: 120,
        height: 120,
        rotation: 25,
        color: '#e13636',
        canPop: true
      }
    ]
  }
];