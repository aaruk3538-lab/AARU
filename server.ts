import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("pixelgram.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    full_name TEXT,
    bio TEXT,
    dob TEXT,
    profile_pic TEXT,
    is_private INTEGER DEFAULT 0,
    is_verified INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    is_suspended INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    image_url TEXT,
    media_type TEXT DEFAULT 'image', -- 'image' or 'video'
    music_title TEXT,
    youtube_id TEXT,
    caption TEXT,
    views INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    image_url TEXT,
    media_type TEXT DEFAULT 'image', -- 'image' or 'video'
    music_title TEXT,
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS follows (
    follower_id INTEGER,
    following_id INTEGER,
    status TEXT DEFAULT 'accepted', -- 'pending' or 'accepted'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(follower_id, following_id),
    FOREIGN KEY(follower_id) REFERENCES users(id),
    FOREIGN KEY(following_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    actor_id INTEGER,
    type TEXT, -- 'like', 'comment', 'follow', 'follow_request'
    post_id INTEGER,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(actor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS verification_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reporter_id INTEGER,
    target_type TEXT, -- 'user', 'post', 'story'
    target_id INTEGER,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reporter_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  // Ensure columns exist for updates
  try { db.prepare("ALTER TABLE posts ADD COLUMN media_type TEXT DEFAULT 'image'").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE posts ADD COLUMN music_title TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE posts ADD COLUMN youtube_id TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE stories ADD COLUMN media_type TEXT DEFAULT 'image'").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE stories ADD COLUMN music_title TEXT").run(); } catch(e) {}
  try { db.prepare("ALTER TABLE stories ADD COLUMN youtube_id TEXT").run(); } catch(e) {}

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json({ limit: '50mb' }));

  // --- API Routes ---

  // Auth
  app.post("/api/auth/register", (req, res) => {
    const { username, email, password, fullName } = req.body;
    try {
      // Check if this is the first user
      const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
      const isAdmin = userCount === 0 ? 1 : 0;
      
      const info = db.prepare("INSERT INTO users (username, email, password, full_name, is_admin) VALUES (?, ?, ?, ?, ?)").run(username, email, password, fullName, isAdmin);
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid);
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: "Username or email already exists" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      if (user.is_suspended) return res.status(403).json({ error: "Account suspended" });
      res.json(user);
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Users
  app.get("/api/users/search", (req, res) => {
    const { q } = req.query;
    const users = db.prepare("SELECT id, username, full_name, profile_pic, is_verified FROM users WHERE username LIKE ? OR full_name LIKE ? LIMIT 10").all(`%${q}%`, `%${q}%`);
    res.json(users);
  });

  app.get("/api/users/:id", (req, res) => {
    const user = db.prepare("SELECT id, username, full_name, bio, profile_pic, is_private, is_verified, created_at FROM users WHERE id = ?").get(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    const postsCount = db.prepare("SELECT COUNT(*) as count FROM posts WHERE user_id = ?").get(req.params.id).count;
    const followersCount = db.prepare("SELECT COUNT(*) as count FROM follows WHERE following_id = ? AND status = 'accepted'").get(req.params.id).count;
    const followingCount = db.prepare("SELECT COUNT(*) as count FROM follows WHERE follower_id = ? AND status = 'accepted'").get(req.params.id).count;
    
    res.json({ ...user, postsCount, followersCount, followingCount });
  });

  app.put("/api/users/:id", (req, res) => {
    const { full_name, bio, profile_pic, is_private } = req.body;
    db.prepare("UPDATE users SET full_name = ?, bio = ?, profile_pic = ?, is_private = ? WHERE id = ?").run(full_name, bio, profile_pic, is_private ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  // Posts
  app.post("/api/posts", (req, res) => {
    const { user_id, image_url, caption, media_type, music_title, youtube_id } = req.body;
    const info = db.prepare("INSERT INTO posts (user_id, image_url, caption, media_type, music_title, youtube_id) VALUES (?, ?, ?, ?, ?, ?)").run(user_id, image_url, caption, media_type || 'image', music_title || null, youtube_id || null);
    res.json({ id: info.lastInsertRowid });
  });

  app.post("/api/posts/:id/view", (req, res) => {
    db.prepare("UPDATE posts SET views = views + 1 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.put("/api/posts/:id", (req, res) => {
    const { caption } = req.body;
    db.prepare("UPDATE posts SET caption = ? WHERE id = ?").run(caption, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/posts/:id", (req, res) => {
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM likes WHERE post_id = ?").run(req.params.id);
    db.prepare("DELETE FROM comments WHERE post_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/stories/:id", (req, res) => {
    db.prepare("DELETE FROM stories WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/feed/:userId", (req, res) => {
    const userId = req.params.userId;
    // Get posts from followed users + own posts
    const posts = db.prepare(`
      SELECT p.*, u.username, u.profile_pic, u.is_verified,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as likes_count,
      (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as has_liked
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ? OR p.user_id IN (SELECT following_id FROM follows WHERE follower_id = ? AND status = 'accepted')
      ORDER BY p.created_at DESC
    `).all(userId, userId, userId);
    res.json(posts);
  });

  // Stories
  app.post("/api/stories", (req, res) => {
    const { user_id, image_url, media_type, music_title, youtube_id } = req.body;
    const expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare("INSERT INTO stories (user_id, image_url, media_type, music_title, youtube_id, expires_at) VALUES (?, ?, ?, ?, ?, ?)").run(user_id, image_url, media_type || 'image', music_title || null, youtube_id || null, expires_at);
    res.json({ success: true });
  });

  app.get("/api/stories/active/:userId", (req, res) => {
    const userId = req.params.userId;
    const now = new Date().toISOString();
    const stories = db.prepare(`
      SELECT s.*, u.username, u.profile_pic
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE (s.user_id = ? OR s.user_id IN (SELECT following_id FROM follows WHERE follower_id = ? AND status = 'accepted'))
      AND s.expires_at > ?
      ORDER BY s.created_at ASC
    `).all(userId, userId, now);
    res.json(stories);
  });

  // Social
  app.post("/api/follow", (req, res) => {
    const { follower_id, following_id } = req.body;
    const targetUser = db.prepare("SELECT is_private FROM users WHERE id = ?").get(following_id);
    const status = targetUser.is_private ? 'pending' : 'accepted';
    
    try {
      db.prepare("INSERT INTO follows (follower_id, following_id, status) VALUES (?, ?, ?)").run(follower_id, following_id, status);
      if (status === 'pending') {
        db.prepare("INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, ?)").run(following_id, follower_id, 'follow_request');
      } else {
        db.prepare("INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, ?)").run(following_id, follower_id, 'follow');
      }
      res.json({ status });
    } catch (e) {
      db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(follower_id, following_id);
      res.json({ status: 'unfollowed' });
    }
  });

  // Social Interactions
  app.post("/api/posts/:id/like", (req, res) => {
    const { user_id } = req.body;
    const post_id = req.params.id;
    try {
      db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)").run(post_id, user_id);
      const post = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(post_id);
      if (post && post.user_id !== user_id) {
        db.prepare("INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)").run(post.user_id, user_id, 'like', post_id);
      }
      res.json({ liked: true });
    } catch (e) {
      db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(post_id, user_id);
      res.json({ liked: false });
    }
  });

  app.get("/api/posts/:id/comments", (req, res) => {
    const comments = db.prepare(`
      SELECT c.*, u.username, u.profile_pic, u.is_verified
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ?
      ORDER BY c.created_at ASC
    `).all(req.params.id);
    res.json(comments);
  });

  app.post("/api/posts/:id/comments", (req, res) => {
    const { user_id, content } = req.body;
    const post_id = req.params.id;
    const info = db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)").run(post_id, user_id, content);
    
    const post = db.prepare("SELECT user_id FROM posts WHERE id = ?").get(post_id);
    if (post && post.user_id !== user_id) {
      db.prepare("INSERT INTO notifications (user_id, actor_id, type, post_id) VALUES (?, ?, ?, ?)").run(post.user_id, user_id, 'comment', post_id);
    }
    
    const comment = db.prepare(`
      SELECT c.*, u.username, u.profile_pic, u.is_verified
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `).get(info.lastInsertRowid);
    res.json(comment);
  });

  // Notifications
  app.get("/api/notifications/:userId", (req, res) => {
    const notifications = db.prepare(`
      SELECT n.*, u.username, u.profile_pic, u.is_verified
      FROM notifications n
      JOIN users u ON n.actor_id = u.id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
      LIMIT 50
    `).all(req.params.userId);
    res.json(notifications);
  });

  app.post("/api/notifications/read", (req, res) => {
    const { userId } = req.body;
    db.prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ?").run(userId);
    res.json({ success: true });
  });

  // Follow Requests
  app.get("/api/follows/requests/:userId", (req, res) => {
    const requests = db.prepare(`
      SELECT f.*, u.username, u.profile_pic, u.is_verified
      FROM follows f
      JOIN users u ON f.follower_id = u.id
      WHERE f.following_id = ? AND f.status = 'pending'
    `).all(req.params.userId);
    res.json(requests);
  });

  app.post("/api/follows/respond", (req, res) => {
    const { follower_id, following_id, action } = req.body; // action: 'accept' or 'reject'
    if (action === 'accept') {
      db.prepare("UPDATE follows SET status = 'accepted' WHERE follower_id = ? AND following_id = ?").run(follower_id, following_id);
      db.prepare("INSERT INTO notifications (user_id, actor_id, type) VALUES (?, ?, ?)").run(follower_id, following_id, 'follow');
    } else {
      db.prepare("DELETE FROM follows WHERE follower_id = ? AND following_id = ?").run(follower_id, following_id);
    }
    res.json({ success: true });
  });

  // Verification
  app.post("/api/verification/request", (req, res) => {
    const { user_id } = req.body;
    try {
      db.prepare("INSERT INTO verification_requests (user_id) VALUES (?)").run(user_id);
      res.json({ success: true });
    } catch (e) {
      res.status(400).json({ error: "Request already pending" });
    }
  });

  app.post("/api/admin/users/suspend", (req, res) => {
    const { user_id, suspend } = req.body;
    db.prepare("UPDATE users SET is_suspended = ? WHERE id = ?").run(suspend ? 1 : 0, user_id);
    res.json({ success: true });
  });

  app.delete("/api/admin/posts/:id", (req, res) => {
    db.prepare("DELETE FROM posts WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/reports", (req, res) => {
    const reports = db.prepare(`
      SELECT r.*, u.username as reporter_name
      FROM reports r
      JOIN users u ON r.reporter_id = u.id
      ORDER BY r.created_at DESC
    `).all();
    res.json(reports);
  });
  app.get("/api/admin/stats", (req, res) => {
    const stats = {
      totalUsers: db.prepare("SELECT COUNT(*) as count FROM users").get().count,
      activeUsers: db.prepare("SELECT COUNT(*) as count FROM users WHERE is_suspended = 0").get().count,
      verifiedUsers: db.prepare("SELECT COUNT(*) as count FROM users WHERE is_verified = 1").get().count,
      totalPosts: db.prepare("SELECT COUNT(*) as count FROM posts").get().count,
      totalStories: db.prepare("SELECT COUNT(*) as count FROM stories").get().count,
      totalReports: db.prepare("SELECT COUNT(*) as count FROM reports").get().count,
    };
    res.json(stats);
  });

  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/verify", (req, res) => {
    const { user_id, status } = req.body;
    if (status === 'approved') {
      db.prepare("UPDATE users SET is_verified = 1 WHERE id = ?").run(user_id);
    }
    db.prepare("UPDATE verification_requests SET status = ? WHERE user_id = ?").run(status, user_id);
    res.json({ success: true });
  });

  // --- WebSockets ---
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    socket.on("join", (userId) => {
      onlineUsers.set(userId, socket.id);
      io.emit("user_status", { userId, status: "online" });
    });

    socket.on("send_message", (data) => {
      const { sender_id, receiver_id, content } = data;
      const info = db.prepare("INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)").run(sender_id, receiver_id, content);
      const message = { id: info.lastInsertRowid, ...data, created_at: new Date().toISOString() };
      
      const receiverSocketId = onlineUsers.get(receiver_id);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("new_message", message);
      }
      socket.emit("message_sent", message);
    });

    socket.on("disconnect", () => {
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          io.emit("user_status", { userId, status: "offline" });
          break;
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
