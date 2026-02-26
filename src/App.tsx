import React, { useState, useEffect, useRef } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  useNavigate, 
  useLocation,
  Link,
  useParams
} from 'react-router-dom';
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User as UserIcon, 
  MessageCircle, 
  Settings, 
  LogOut, 
  CheckCircle2, 
  MoreHorizontal, 
  Send, 
  Bookmark, 
  Camera,
  X,
  ChevronLeft,
  ShieldCheck,
  Users,
  BarChart3,
  AlertCircle,
  Moon,
  Sun,
  Menu,
  Bell,
  Music,
  Play,
  Pause,
  Film,
  Image as ImageIcon,
  Trash2,
  Edit2,
  ChevronRight,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { cn, User, Post, Story, Message } from './types';

// --- Utils ---

const safeJson = async (res: Response) => {
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Error ${res.status}`);
  }
  return text;
};

// --- Components ---

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger', size?: 'sm' | 'md' | 'lg' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm',
      secondary: 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700',
      ghost: 'bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800',
      danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-lg',
      md: 'px-4 py-2 rounded-xl font-medium',
      lg: 'px-6 py-3 text-lg rounded-2xl font-bold',
    };
    return (
      <button
        ref={ref}
        className={cn('transition-all active:scale-95 disabled:opacity-50', variants[variant], sizes[size], className)}
        {...props}
      />
    );
  }
);

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full px-4 py-3 rounded-xl bg-zinc-100 border-none focus:ring-2 focus:ring-indigo-500 outline-none dark:bg-zinc-800 dark:text-white transition-all',
        className
      )}
      {...props}
    />
  )
);

const Avatar = ({ src, className, size = 'md', username }: { src?: string, className?: string, size?: 'sm' | 'md' | 'lg' | 'xl', username?: string }) => {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };
  return (
    <div className={cn('rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 border border-black/5 dark:border-white/5', sizes[size], className)}>
      <img 
        src={src || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username || 'default'}`} 
        alt="Avatar" 
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title?: string, children: React.ReactNode }) => {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="flex items-center justify-between p-4 border-bottom dark:border-zinc-800">
            <h3 className="text-lg font-bold">{title}</h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
              <X size={20} />
            </button>
          </div>
          <div className="p-4">{children}</div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// --- Context & Hooks ---

const AuthContext = React.createContext<{
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
} | null>(null);

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
} | null>(null);

const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

// --- Pages ---

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await safeJson(res);
    if (res.ok) {
      login(data);
      navigate(data.is_admin ? '/admin' : '/');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Logo className="justify-center mb-2" />
          <p className="mt-2 text-zinc-500">Connect with the world in pixels.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button className="w-full py-4 text-lg">Log In</Button>
        </form>
        <div className="text-center space-y-4">
          <p className="text-sm text-zinc-500">
            Don't have an account? <Link to="/register" className="text-indigo-600 font-bold">Sign Up</Link>
          </p>
          <div className="pt-4 border-t dark:border-zinc-800">
            <Link to="/admin" className="text-xs text-zinc-400 hover:text-indigo-500 transition-colors">
              Go to Admin Panel (Requires Admin Account)
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', fullName: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const data = await safeJson(res);
    if (res.ok) {
      login(data);
      navigate('/');
    } else {
      setError(data.error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Logo className="justify-center mb-2" />
          <p className="mt-2 text-zinc-500">Join our creative community.</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <Input placeholder="Full Name" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} required />
          <Input placeholder="Username" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} required />
          <Input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
          <Input type="password" placeholder="Password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required />
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <Button className="w-full py-4 text-lg">Sign Up</Button>
        </form>
        <div className="text-center">
          <p className="text-sm text-zinc-500">
            Already have an account? <Link to="/login" className="text-indigo-600 font-bold">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Logo = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center gap-3", className)}>
    <div className="relative w-12 h-12 flex items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 rounded-[20px] rotate-6 opacity-20 blur-sm"></div>
      <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-500 to-pink-500 flex items-center justify-center shadow-xl shadow-indigo-500/30 overflow-hidden border border-white/20">
        <span className="text-white font-black text-xl tracking-tighter drop-shadow-md">A</span>
      </div>
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full blur-[2px] opacity-60 animate-pulse"></div>
    </div>
    <span className="text-3xl font-serif italic font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight">AARU</span>
  </div>
);

const AudioPlayer = ({ youtubeId, isPlaying = true }: { youtubeId?: string, isPlaying?: boolean }) => {
  if (!youtubeId || !isPlaying) return null;
  const embedUrl = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&loop=1&playlist=${youtubeId}&enablejsapi=1&origin=${window.location.origin}&controls=0&showinfo=0&rel=0&iv_load_policy=3&modestbranding=1`;
  return (
    <div className="hidden pointer-events-none absolute -z-10 opacity-0">
      <iframe 
        width="0" 
        height="0" 
        src={embedUrl} 
        allow="autoplay; encrypted-media"
        title="Audio Player"
      />
    </div>
  );
};

const PostCard = ({ post, onLike, onDelete }: { post: Post, onLike: (id: number) => void, onDelete?: (id: number) => void }) => {
  const { user } = useAuth();
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const lastTap = useRef<number>(0);

  const fetchComments = async () => {
    const res = await fetch(`/api/posts/${post.id}/comments`);
    setComments(await safeJson(res));
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id, content: newComment }),
    });
    if (res.ok) {
      const comment = await safeJson(res);
      setComments(prev => [...prev, comment]);
      setNewComment('');
    }
  };

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!post.has_liked) onLike(post.id);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 1000);
    }
    lastTap.current = now;
  };

  const trackView = async () => {
    if (hasViewed) return;
    await fetch(`/api/posts/${post.id}/view`, { method: 'POST' });
    setHasViewed(true);
  };

  const handleDelete = async () => {
    if (window.confirm("Delete this post?")) {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' });
      if (res.ok && onDelete) onDelete(post.id);
    }
  };

  const handleUpdate = async () => {
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caption: editCaption }),
    });
    if (res.ok) {
      setIsEditOpen(false);
      post.caption = editCaption;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onViewportEnter={() => {
        trackView();
        if (post.youtube_id) setIsPlaying(true);
      }}
      onViewportLeave={() => {
        if (post.youtube_id) setIsPlaying(false);
      }}
      viewport={{ amount: 0.6 }}
      className="bg-white dark:bg-zinc-900 border-y sm:border sm:rounded-[32px] overflow-hidden dark:border-zinc-800 mb-4 shadow-sm"
    >
      <div className="flex items-center justify-between p-4">
        <Link to={`/profile/${post.user_id}`} className="flex items-center gap-3">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
            <Avatar src={post.profile_pic} username={post.username} className="border-2 border-white dark:border-zinc-900" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-sm tracking-tight">{post.username}</span>
              {post.is_verified && <CheckCircle2 size={14} className="text-blue-500 fill-blue-500 text-white" />}
            </div>
            <span className="text-[10px] text-zinc-500 font-medium">{formatDistanceToNow(new Date(post.created_at))} ago</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {user?.id === post.user_id && (
            <div className="flex gap-1">
              <button onClick={() => setIsEditOpen(true)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500">
                <Edit2 size={16} />
              </button>
              <button onClick={handleDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors text-red-500">
                <Trash2 size={16} />
              </button>
            </div>
          )}
          <button className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>
      </div>

      <div 
        className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden cursor-pointer" 
        onClick={handleDoubleTap}
      >
        {post.media_type === 'video' ? (
          <video 
            src={post.image_url} 
            className="w-full h-full object-cover" 
            autoPlay 
            loop 
            playsInline 
          />
        ) : (
          <img src={post.image_url} alt="Post" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        )}
        
        <AnimatePresence>
          {showHeart && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.5, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
            >
              <Heart size={100} className="text-white fill-white drop-shadow-2xl" />
            </motion.div>
          )}
        </AnimatePresence>

        {post.youtube_id && isPlaying && <AudioPlayer youtubeId={post.youtube_id} isPlaying={isPlaying} />}
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/10">
          {post.youtube_id && (
            <button 
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
              className="bg-white/20 backdrop-blur-xl p-6 rounded-full border border-white/30 shadow-2xl hover:scale-110 transition-transform"
            >
              {isPlaying ? <Pause className="text-white" size={32} /> : <Play className="text-white" size={32} fill="currentColor" />}
            </button>
          )}
        </div>

        {post.music_title && (
          <div className="absolute bottom-4 left-4 right-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full text-xs font-bold w-fit shadow-lg">
              <Music size={14} className={cn(isPlaying && "animate-spin")} />
              <span className="truncate max-w-[150px]">{post.music_title}</span>
            </div>
            {!isPlaying && post.youtube_id && (
              <span className="text-[10px] text-white font-bold drop-shadow-md ml-2 animate-bounce">Tap play for music 🎵</span>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => onLike(post.id)}
              className={cn("transition-all active:scale-150", post.has_liked ? "text-red-500" : "hover:text-red-500")}
            >
              <Heart size={28} fill={post.has_liked ? "currentColor" : "none"} strokeWidth={2} />
            </button>
            <button onClick={() => { setIsCommentsOpen(true); fetchComments(); }} className="hover:text-indigo-500 transition-colors">
              <MessageCircle size={28} strokeWidth={2} />
            </button>
            <button className="hover:text-indigo-500 transition-colors">
              <Send size={28} strokeWidth={2} />
            </button>
          </div>
          <button className="hover:text-indigo-500 transition-colors">
            <Bookmark size={28} strokeWidth={2} />
          </button>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <p className="text-sm font-black">{post.likes_count.toLocaleString()} likes</p>
            <p className="text-sm text-zinc-500 font-medium">{post.views?.toLocaleString() || 0} views</p>
          </div>
          <p className="text-sm leading-relaxed">
            <span className="font-black mr-2">{post.username}</span>
            {post.caption}
          </p>
          <button 
            onClick={() => { setIsCommentsOpen(true); fetchComments(); }} 
            className="text-sm text-zinc-500 font-medium mt-1 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
          >
            View all comments
          </button>
        </div>
      </div>

      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Post">
        <div className="space-y-4">
          <textarea 
            className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
            value={editCaption}
            onChange={e => setEditCaption(e.target.value)}
          />
          <Button onClick={handleUpdate} className="w-full">Save Changes</Button>
        </div>
      </Modal>

      <Modal isOpen={isCommentsOpen} onClose={() => setIsCommentsOpen(false)} title="Comments">
        <div className="flex flex-col h-[500px]">
          <div className="flex-1 overflow-y-auto space-y-5 mb-4 pr-2 custom-scrollbar">
            {comments.map(c => (
              <div key={c.id} className="flex gap-3 group">
                <Avatar src={c.profile_pic} username={c.username} size="sm" />
                <div className="flex-1">
                  <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none">
                    <p className="text-sm">
                      <span className="font-bold mr-2">{c.username}</span>
                      {c.content}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-1">
                    <span className="text-[10px] text-zinc-500 font-bold">{formatDistanceToNow(new Date(c.created_at))} ago</span>
                    <button className="text-[10px] text-zinc-500 font-bold hover:text-zinc-900 dark:hover:text-zinc-100">Reply</button>
                  </div>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div className="text-center py-20 space-y-3">
                <MessageCircle className="mx-auto text-zinc-200" size={48} />
                <p className="text-zinc-500 font-medium">No comments yet. Be the first to say something!</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-4 border-t dark:border-zinc-800">
            <Input 
              placeholder="Add a comment..." 
              value={newComment} 
              onChange={e => setNewComment(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddComment()}
              className="bg-zinc-100 dark:bg-zinc-800 border-none"
            />
            <Button onClick={handleAddComment} className="px-6">Post</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

const StoryViewer = ({ stories, isOpen, onClose, onDelete }: { stories: Story[], isOpen: boolean, onClose: () => void, onDelete?: (id: number) => void }) => {
  const { user } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const story = stories[currentIndex];

  useEffect(() => {
    if (!isOpen) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(c => c + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + 1;
      });
    }, 50); // 5 seconds total (100 * 50ms)
    return () => clearInterval(interval);
  }, [currentIndex, isOpen, stories.length, onClose]);

  const handleDelete = async () => {
    if (window.confirm("Delete this story?")) {
      const res = await fetch(`/api/stories/${story.id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDelete) onDelete(story.id);
        if (stories.length === 1) {
          onClose();
        } else {
          if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
          } else {
            onClose();
          }
        }
      }
    }
  };

  if (!isOpen || !story) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in zoom-in-95 duration-300">
      {/* Progress Bars */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex gap-1.5">
        {stories.map((_, i) => (
          <div key={i} className="flex-1 h-[2px] bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-75 ease-linear"
              style={{ width: i === currentIndex ? `${progress}%` : (i < currentIndex ? '100%' : '0%') }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-6 left-0 right-0 p-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-[2px] rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
            <Avatar src={story.profile_pic} username={story.username} size="sm" className="border border-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-sm tracking-tight drop-shadow-md">{story.username}</span>
            <span className="text-white/70 text-[10px] font-bold drop-shadow-md">{formatDistanceToNow(new Date(story.created_at))} ago</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.id === story.user_id && (
            <button onClick={handleDelete} className="text-white p-2 hover:bg-red-500/20 rounded-full transition-colors">
              <Trash2 size={20} className="text-red-400" />
            </button>
          )}
          <button className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
            <MoreHorizontal size={24} />
          </button>
          <button onClick={onClose} className="text-white p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={28} />
          </button>
        </div>
      </div>

      {/* Media Content */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div 
            key={story.id}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            {story.media_type === 'video' ? (
              <video src={story.image_url} className="w-full h-full object-cover" autoPlay playsInline />
            ) : (
              <img src={story.image_url} className="w-full h-full object-cover" alt="Story" />
            )}
          </motion.div>
        </AnimatePresence>
        
        {story.youtube_id && <AudioPlayer youtubeId={story.youtube_id} isPlaying={true} />}

        {story.music_title && (
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 glass px-5 py-2.5 rounded-full text-white flex items-center gap-3 shadow-2xl border border-white/20"
          >
            <div className="bg-white/20 p-1.5 rounded-full animate-spin">
              <Music size={16} />
            </div>
            <span className="text-sm font-black tracking-tight">{story.music_title}</span>
          </motion.div>
        )}

        {/* Navigation areas */}
        <div className="absolute inset-0 flex z-10">
          <div className="w-1/3 h-full cursor-pointer" onClick={() => {
            if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
          }} />
          <div className="w-2/3 h-full cursor-pointer" onClick={() => {
            if (currentIndex < stories.length - 1) setCurrentIndex(prev => prev + 1);
            else onClose();
          }} />
        </div>
      </div>

      {/* Footer / Reply */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-20 flex items-center gap-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Send message..." 
            className="w-full bg-transparent border border-white/40 rounded-full px-5 py-3 text-white text-sm outline-none focus:border-white transition-colors"
          />
        </div>
        <button className="text-white hover:scale-110 transition-transform">
          <Heart size={28} />
        </button>
        <button className="text-white hover:scale-110 transition-transform">
          <Send size={28} />
        </button>
      </div>
    </div>
  );
};

const EditProfileModal = ({ isOpen, onClose, user, onUpdate }: { isOpen: boolean, onClose: () => void, user: User, onUpdate: () => void }) => {
  const { updateUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    bio: user.bio || '',
    profile_pic: user.profile_pic || '',
    is_private: user.is_private
  });
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, profile_pic: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      updateUser(formData);
      onUpdate();
      onClose();
    }
    setLoading(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile">
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-pic-input')?.click()}>
            <Avatar src={formData.profile_pic} username={user.username} size="xl" />
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera className="text-white" size={24} />
            </div>
          </div>
          <input id="profile-pic-input" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          <Button variant="ghost" size="sm" onClick={() => document.getElementById('profile-pic-input')?.click()}>Change Photo</Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Full Name</label>
            <Input value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Bio</label>
            <textarea 
              className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[100px]"
              value={formData.bio}
              onChange={e => setFormData({ ...formData, bio: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between p-4 glass rounded-2xl">
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} />
              <span>Private Account</span>
            </div>
            <input 
              type="checkbox" 
              checked={formData.is_private} 
              onChange={e => setFormData({ ...formData, is_private: e.target.checked })}
              className="w-6 h-6 accent-indigo-600"
            />
          </div>
        </div>

        <Button className="w-full py-4" onClick={handleSave} disabled={loading}>
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Modal>
  );
};

const FeedPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStories, setSelectedStories] = useState<Story[] | null>(null);

  const fetchData = async () => {
    const [postsRes, storiesRes] = await Promise.all([
      fetch(`/api/feed/${user?.id}`),
      fetch(`/api/stories/active/${user?.id}`)
    ]);
    setPosts(await postsRes.json());
    setStories(await storiesRes.json());
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) acc[story.user_id] = [];
    acc[story.user_id].push(story);
    return acc;
  }, {} as Record<number, Story[]>);

  const handleLike = async (postId: number) => {
    const res = await fetch(`/api/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id }),
    });
    if (res.ok) {
      const { liked } = await safeJson(res);
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          return {
            ...p,
            has_liked: liked,
            likes_count: liked ? p.likes_count + 1 : p.likes_count - 1
          };
        }
        return p;
      }));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="pb-20 pt-16 max-w-lg mx-auto">
      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto p-4 scrollbar-hide">
        <Link to="/add" className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="w-16 h-16 rounded-full p-0.5 border-2 border-indigo-500 relative">
            <Avatar src={user?.profile_pic} username={user?.username} size="lg" className="w-full h-full" />
            <div className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full p-0.5 border-2 border-white dark:border-zinc-900">
              <PlusSquare size={12} />
            </div>
          </div>
          <span className="text-xs">Your Story</span>
        </Link>
        {Object.values(groupedStories).map(userStories => (
          <div 
            key={userStories[0].user_id} 
            className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
            onClick={() => setSelectedStories(userStories)}
          >
            <div className="w-16 h-16 rounded-full p-0.5 border-2 border-indigo-500">
              <Avatar src={userStories[0].profile_pic} username={userStories[0].username} size="lg" className="w-full h-full" />
            </div>
            <span className="text-xs truncate w-16 text-center">{userStories[0].username}</span>
          </div>
        ))}
      </div>

      <StoryViewer 
        stories={selectedStories || []} 
        isOpen={!!selectedStories} 
        onClose={() => setSelectedStories(null)} 
        onDelete={() => fetchData()}
      />

      {/* Posts */}
      <div className="space-y-6">
        {posts.map(post => (
          <PostCard key={post.id} post={post} onLike={handleLike} onDelete={() => fetchData()} />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500">No posts yet. Follow some people!</p>
          </div>
        )}
      </div>
    </div>
  );
};

const NotificationsPage = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      const res = await fetch(`/api/notifications/${user?.id}`);
      setNotifications(await safeJson(res));
      // Mark as read
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
    };
    fetchNotifications();
  }, [user?.id]);

  const getNotificationText = (type: string) => {
    switch (type) {
      case 'like': return 'liked your post.';
      case 'comment': return 'commented on your post.';
      case 'follow': return 'started following you.';
      case 'follow_request': return 'sent you a follow request.';
      default: return 'interacted with you.';
    }
  };

  return (
    <div className="pb-20 pt-16 max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Notifications</h2>
      <div className="space-y-4">
        {notifications.map(n => (
          <div key={n.id} className={cn("flex items-center justify-between p-3 rounded-2xl", n.is_read ? "bg-transparent" : "bg-indigo-50 dark:bg-indigo-900/20")}>
            <div className="flex items-center gap-3">
              <Avatar src={n.profile_pic} username={n.username} />
              <div>
                <p className="text-sm">
                  <span className="font-bold mr-1">{n.username}</span>
                  {getNotificationText(n.type)}
                </p>
                <span className="text-[10px] text-zinc-500">{formatDistanceToNow(new Date(n.created_at))} ago</span>
              </div>
            </div>
            {n.type === 'follow_request' && (
              <div className="flex gap-2">
                <Button size="sm">Accept</Button>
                <Button variant="secondary" size="sm">Reject</Button>
              </div>
            )}
          </div>
        ))}
        {notifications.length === 0 && (
          <p className="text-center text-zinc-500 py-10">No notifications yet.</p>
        )}
      </div>
    </div>
  );
};

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const search = async () => {
      const res = await fetch(`/api/users/search?q=${query}`);
      setResults(await safeJson(res));
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="pb-20 pt-16 max-w-lg mx-auto p-4">
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
        <Input 
          placeholder="Search friends..." 
          className="pl-12" 
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {results.map(u => (
          <Link to={`/profile/${u.id}`} key={u.id} className="flex items-center justify-between p-3 glass rounded-2xl">
            <div className="flex items-center gap-3">
              <Avatar src={u.profile_pic} username={u.username} />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold">{u.username}</span>
                  {u.is_verified && <CheckCircle2 size={14} className="text-blue-500 fill-blue-500 text-white" />}
                </div>
                <span className="text-xs text-zinc-500">{u.full_name}</span>
              </div>
            </div>
            <Button variant="secondary" size="sm">View</Button>
          </Link>
        ))}
        {query.length >= 2 && results.length === 0 && (
          <p className="text-center text-zinc-500 py-10">No users found.</p>
        )}
      </div>
    </div>
  );
};

const YouTubeMusicSearch = ({ onSelect }: { onSelect: (song: { title: string, id: string }) => void }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ title: string, id: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const searchMusic = async () => {
    if (!query.trim()) return;
    setLoading(true);
    
    // Simulate a more realistic search with common Hindi/Bhojpuri/Global hits
    const allSongs = [
      { title: "Kesariya - Brahmastra", id: "BddP6PYo2gs" },
      { title: "Pasoori - Ali Sethi", id: "5Eqb_-j3FDA" },
      { title: "Lollipop Lagelu - Pawan Singh", id: "9bZkp7q19f0" },
      { title: "Raataan Lambiyan - Shershaah", id: "g6fnF0YSg_o" },
      { title: "Tum Hi Ho - Aashiqui 2", id: "Umqb9KENgmk" },
      { title: "Shape of You - Ed Sheeran", id: "JGwWNGJdvx8" },
      { title: "Blinding Lights - The Weeknd", id: "4NRXx6U8ABQ" },
      { title: "Stay - Justin Bieber", id: "kTJczUoc26U" },
      { title: "Dil De Diya Hai - Masti", id: "kJQP7kiw5Fk" },
      { title: "Lehanga - Jass Manak", id: "RKioDWlajvo" },
      { title: "8 Parche - Baani Sandhu", id: "DWcJFNfaw9c" },
      { title: "Khaab - Akhil", id: "2f2_m9S2S_M" }
    ];

    const filtered = allSongs.filter(s => s.title.toLowerCase().includes(query.toLowerCase()));
    
    // If no match, generate some dynamic ones based on query
    if (filtered.length === 0) {
      setResults([
        { title: `${query} - Official Audio`, id: "dQw4w9WgXcQ" },
        { title: `${query} (Remix)`, id: "kJQP7kiw5Fk" },
        { title: `${query} - Live`, id: "fJ9rUzIMcZQ" }
      ]);
    } else {
      setResults(filtered);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <Input 
            placeholder="Search Hindi, Bhojpuri, Global songs..." 
            className="pl-10"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && searchMusic()}
          />
        </div>
        <Button onClick={searchMusic} disabled={loading}>Search</Button>
      </div>
      <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
        {results.map(song => (
          <div 
            key={song.id}
            className="w-full flex items-center gap-3 p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-all group border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700"
          >
            <button 
              onClick={() => setPreviewId(previewId === song.id ? null : song.id)}
              className="w-12 h-12 bg-red-50 dark:bg-red-900/40 rounded-xl flex items-center justify-center text-white shadow-lg shadow-red-500/20 hover:scale-105 transition-transform"
            >
              {previewId === song.id ? <Pause size={24} /> : <Play size={24} fill="currentColor" />}
            </button>
            <div className="flex-1 cursor-pointer overflow-hidden" onClick={() => onSelect(song)}>
              <p className="text-sm font-bold truncate">{song.title}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">YouTube Music</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => onSelect(song)}>Select</Button>
          </div>
        ))}
        {previewId && <AudioPlayer youtubeId={previewId} isPlaying={true} />}
        {results.length === 0 && !loading && (
          <div className="text-center py-12 space-y-2">
            <Music className="mx-auto text-zinc-300" size={48} />
            <p className="text-zinc-500 text-sm">Search for any song to add to your story</p>
          </div>
        )}
      </div>
    </div>
  );
};

const CameraPreview = ({ onCapture }: { onCapture: (blob: string) => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (err) {
        console.error("Camera error:", err);
      }
    };
    startCamera();
    return () => {
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const capture = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        onCapture(canvasRef.current.toDataURL('image/jpeg'));
      }
    }
  };

  return (
    <div className="relative aspect-[9/16] bg-black rounded-3xl overflow-hidden">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <button 
          onClick={capture}
          className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-transform"
        >
          <div className="w-12 h-12 bg-white rounded-full" />
        </button>
      </div>
    </div>
  );
};

const AddPostPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [media, setMedia] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [musicTitle, setMusicTitle] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isStory, setIsStory] = useState(false);
  const [isMusicPickerOpen, setIsMusicPickerOpen] = useState(false);
  const [showCamera, setShowCamera] = useState(false);

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      setMediaType(type);
      const reader = new FileReader();
      reader.onloadend = () => setMedia(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!media) return;
    setLoading(true);
    const endpoint = isStory ? '/api/stories' : '/api/posts';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        user_id: user?.id, 
        image_url: media, 
        caption: isStory ? undefined : caption,
        media_type: mediaType,
        music_title: musicTitle || undefined,
        youtube_id: youtubeId || undefined
      }),
    });
    if (res.ok) navigate('/');
    setLoading(false);
  };

  if (isStory && !media && showCamera) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col p-4">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setShowCamera(false)} className="text-white p-2">
            <X size={24} />
          </button>
          <h2 className="text-white font-bold">Story Camera</h2>
          <div className="w-10" />
        </div>
        <CameraPreview onCapture={(blob) => { setMedia(blob); setMediaType('image'); setShowCamera(false); }} />
      </div>
    );
  }

  return (
    <div className="pb-20 pt-16 max-w-lg mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Create {isStory ? 'Story' : 'Post'}</h2>
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <button 
            onClick={() => { setIsStory(false); setMedia(null); }}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", !isStory ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500")}
          >
            Post
          </button>
          <button 
            onClick={() => { setIsStory(true); setMedia(null); }}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all", isStory ? "bg-white dark:bg-zinc-700 shadow-sm" : "text-zinc-500")}
          >
            Story
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div 
          className={cn(
            "rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center overflow-hidden relative group cursor-pointer",
            isStory ? "aspect-[9/16]" : "aspect-square"
          )}
        >
          {media ? (
            <>
              {mediaType === 'video' ? (
                <video src={media} className="w-full h-full object-cover" autoPlay muted loop playsInline />
              ) : (
                <img src={media} alt="Preview" className="w-full h-full object-cover" />
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button onClick={() => setMedia(null)} className="p-2 glass rounded-full text-white">
                  <X size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => document.getElementById('file-input')?.click()}
                  className="flex flex-col items-center gap-2 p-6 glass rounded-3xl hover:scale-105 transition-transform"
                >
                  <ImageIcon className="text-indigo-500" size={32} />
                  <span className="text-xs font-bold">Gallery</span>
                </button>
                {isStory && (
                  <button 
                    onClick={() => setShowCamera(true)}
                    className="flex flex-col items-center gap-2 p-6 glass rounded-3xl hover:scale-105 transition-transform"
                  >
                    <Camera className="text-indigo-500" size={32} />
                    <span className="text-xs font-bold">Camera</span>
                  </button>
                )}
              </div>
              <p className="text-zinc-500 text-sm">Select media to continue</p>
            </div>
          )}
          <input id="file-input" type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaChange} />
        </div>

        {media && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <button 
              onClick={() => setIsMusicPickerOpen(true)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                musicTitle 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" 
                  : "bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-xl", musicTitle ? "bg-white/20" : "bg-indigo-500/10 text-indigo-500")}>
                  <Music size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold">{musicTitle || "Add Music"}</p>
                  <p className={cn("text-[10px] font-medium uppercase tracking-wider", musicTitle ? "text-white/70" : "text-zinc-500")}>
                    {musicTitle ? "Song Selected" : "Search YouTube"}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className={musicTitle ? "text-white/70" : "text-zinc-400"} />
            </button>
            
            {!isStory && (
              <textarea 
                placeholder="Write a caption..." 
                className="w-full p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[120px]"
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
            )}

            <Button 
              className="w-full py-4 text-lg" 
              disabled={loading}
              onClick={handleSubmit}
            >
              {loading ? 'Sharing...' : `Share ${isStory ? 'Story' : 'Post'}`}
            </Button>
          </div>
        )}
      </div>

      <Modal isOpen={isMusicPickerOpen} onClose={() => setIsMusicPickerOpen(false)} title="YouTube Music Search">
        <YouTubeMusicSearch onSelect={(song) => { setMusicTitle(song.title); setYoutubeId(song.id); setIsMusicPickerOpen(false); }} />
      </Modal>
    </div>
  );
};

const ChatPage = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socketRef.current = io();
    socketRef.current.emit('join', user?.id);

    socketRef.current.on('new_message', (msg: Message) => {
      if (selectedChat?.id === msg.sender_id) {
        setMessages(prev => [...prev, msg]);
      }
    });

    socketRef.current.on('message_sent', (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user?.id, selectedChat?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    socketRef.current?.emit('send_message', {
      sender_id: user?.id,
      receiver_id: selectedChat.id,
      content: newMessage
    });
    setNewMessage('');
  };

  if (selectedChat) {
    return (
      <div className="fixed inset-0 z-50 bg-white dark:bg-zinc-950 flex flex-col">
        <div className="flex items-center gap-3 p-4 border-b dark:border-zinc-800">
          <button onClick={() => setSelectedChat(null)} className="p-2 -ml-2">
            <ChevronLeft size={24} />
          </button>
          <Avatar src={selectedChat.profile_pic} username={selectedChat.username} />
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold">{selectedChat.username}</span>
              {selectedChat.is_verified && <CheckCircle2 size={14} className="text-blue-500 fill-blue-500 text-white" />}
            </div>
            <span className="text-[10px] text-green-500">Online</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={cn("flex", msg.sender_id === user?.id ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[70%] p-3 rounded-2xl text-sm",
                msg.sender_id === user?.id ? "bg-indigo-600 text-white rounded-tr-none" : "bg-zinc-100 dark:bg-zinc-800 rounded-tl-none"
              )}>
                {msg.content}
                <div className="text-[10px] opacity-70 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
        <div className="p-4 border-t dark:border-zinc-800 flex gap-2">
          <Input 
            placeholder="Message..." 
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
          />
          <Button onClick={handleSendMessage} className="px-6">
            <Send size={20} />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20 pt-16 max-w-lg mx-auto p-4">
      <h2 className="text-2xl font-bold mb-6">Messages</h2>
      <div className="space-y-4">
        {/* Mocking some chat list for now */}
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className="flex items-center gap-4 p-3 glass rounded-2xl cursor-pointer"
            onClick={() => setSelectedChat({ id: i + 10, username: `user_${i}`, profile_pic: '', full_name: `User ${i}`, is_verified: i === 1 } as any)}
          >
            <div className="relative">
              <Avatar size="md" username={`user_${i}`} />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full"></div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-bold">user_{i}</span>
                <span className="text-[10px] text-zinc-500">2m ago</span>
              </div>
              <p className="text-sm text-zinc-500 truncate">Hey, how's it going?</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { userId } = useParams();
  const { user, logout, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const targetId = userId ? parseInt(userId) : user?.id;
  const isOwnProfile = !userId || parseInt(userId) === user?.id;

  const fetchProfile = async () => {
    if (!targetId) return;
    setLoading(true);
    try {
      const [profileRes, postsRes, followRes] = await Promise.all([
        fetch(`/api/users/${targetId}`),
        fetch(`/api/feed/${targetId}`),
        !isOwnProfile ? fetch(`/api/users/${targetId}/is-following?follower_id=${user?.id}`) : Promise.resolve(null)
      ]);
      
      const profileData = await safeJson(profileRes);
      const postsData = await safeJson(postsRes);
      
      setProfile(profileData);
      setPosts(postsData.filter((p: Post) => p.user_id === targetId));
      
      if (isOwnProfile) {
        updateUser(profileData);
      } else if (followRes) {
        const { following } = await safeJson(followRes);
        setIsFollowing(following);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [targetId]);

  const handleFollow = async () => {
    if (!targetId || !user) return;
    const res = await fetch(`/api/users/${targetId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ follower_id: user.id }),
    });
    if (res.ok) {
      setIsFollowing(!isFollowing);
      fetchProfile();
    }
  };

  const handleRequestVerification = async () => {
    setIsVerifying(true);
    const res = await fetch('/api/verification/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user?.id }),
    });
    if (res.ok) {
      alert('Verification request sent!');
    } else {
      const data = await safeJson(res);
      alert(data.error || 'Request failed');
    }
    setIsVerifying(false);
  };

  if (!profile) return null;

  return (
    <div className="pb-20 pt-16 max-w-lg mx-auto">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Avatar src={profile.profile_pic} username={profile.username} size="xl" />
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-bold text-lg">{profile.postsCount}</p>
              <p className="text-xs text-zinc-500">Posts</p>
            </div>
            <div>
              <p className="font-bold text-lg">{profile.followersCount}</p>
              <p className="text-xs text-zinc-500">Followers</p>
            </div>
            <div>
              <p className="font-bold text-lg">{profile.followingCount}</p>
              <p className="text-xs text-zinc-500">Following</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold">{profile.username}</h2>
            {profile.is_verified && <CheckCircle2 size={18} className="text-blue-500 fill-blue-500 text-white" />}
          </div>
          <p className="text-zinc-500 text-sm mb-2">{profile.full_name}</p>
          <p className="text-sm">{profile.bio || "No bio yet."}</p>
        </div>

        <div className="flex gap-2">
          {isOwnProfile ? (
            <>
              <Button variant="secondary" className="flex-1" onClick={() => setIsEditOpen(true)}>Edit Profile</Button>
              <Button variant="secondary" className="flex-1">Share Profile</Button>
              <Button variant="secondary" onClick={() => setIsSettingsOpen(true)}>
                <Settings size={20} />
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant={isFollowing ? "secondary" : "primary"} 
                className="flex-1"
                onClick={handleFollow}
              >
                {isFollowing ? 'Following' : 'Follow'}
              </Button>
              <Button variant="secondary" className="flex-1">Message</Button>
            </>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 pt-6">
          {posts.map(post => (
            <div 
              key={post.id} 
              onClick={() => setSelectedPost(post)}
              className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative group cursor-pointer"
            >
              {post.media_type === 'video' ? (
                <video src={post.image_url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={post.image_url} alt="Post" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              )}
              {post.youtube_id && (
                <div className="absolute top-2 right-2 text-white drop-shadow-md">
                  <Music size={14} />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-bold text-sm">
                <div className="flex items-center gap-1">
                  <Heart size={16} fill="white" />
                  <span>{post.likes_count}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Eye size={16} />
                  <span>{post.views || 0}</span>
                </div>
              </div>
            </div>
          ))}
          {posts.length === 0 && (
            <div className="col-span-3 py-20 text-center space-y-4">
              <div className="w-20 h-20 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center mx-auto">
                <Camera size={32} className="text-zinc-400" />
              </div>
              <p className="text-zinc-500 font-medium">No posts yet. Start sharing your world!</p>
            </div>
          )}
        </div>
      </div>

      <EditProfileModal 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        user={profile} 
        onUpdate={fetchProfile} 
      />

      <Modal isOpen={!!selectedPost} onClose={() => setSelectedPost(null)} title="Post">
        {selectedPost && (
          <PostCard 
            post={selectedPost} 
            onLike={(id) => {
              fetchProfile();
            }} 
            onDelete={(id) => {
              setSelectedPost(null);
              fetchProfile();
            }}
          />
        )}
      </Modal>

      <Modal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} title="Settings">
        <div className="space-y-2">
          <button onClick={toggleTheme} className="w-full flex items-center justify-between p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </div>
          </button>
          {!profile.is_verified && (
            <button 
              onClick={handleRequestVerification}
              disabled={isVerifying}
              className="w-full flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors"
            >
              <CheckCircle2 size={20} className="text-blue-500" />
              <span>{isVerifying ? 'Requesting...' : 'Request Verification'}</span>
            </button>
          )}
          <button className="w-full flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">
            <ShieldCheck size={20} />
            <span>Privacy Controls</span>
          </button>
          <button className="w-full flex items-center gap-3 p-4 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition-colors">
            <AlertCircle size={20} />
            <span>Report a Problem</span>
          </button>
          <button onClick={logout} className="w-full flex items-center gap-3 p-4 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors">
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </Modal>
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const { user, logout } = useAuth();

  const [reports, setReports] = useState<any[]>([]);

  const fetchData = async () => {
    const [statsRes, usersRes, verRes, reportsRes] = await Promise.all([
      fetch('/api/admin/stats'),
      fetch('/api/admin/users'),
      fetch('/api/admin/verification-requests'),
      fetch('/api/admin/reports')
    ]);
    const [statsData, usersData, verData, reportsData] = await Promise.all([
      safeJson(statsRes),
      safeJson(usersRes),
      safeJson(verRes),
      safeJson(reportsRes)
    ]);
    setStats(statsData);
    setUsers(usersData);
    setVerificationRequests(verData);
    setReports(reportsData);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSuspend = async (userId: number, currentStatus: boolean) => {
    const res = await fetch('/api/admin/users/suspend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, suspend: !currentStatus }),
    });
    if (res.ok) fetchData();
  };

  const handleVerify = async (userId: number, status: 'approved' | 'rejected') => {
    const res = await fetch('/api/admin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, status }),
    });
    if (res.ok) {
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-zinc-900 border-r dark:border-zinc-800 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-serif italic font-bold text-indigo-600">Pixelgram Admin</h1>
        </div>
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setActiveTab('overview')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-colors", activeTab === 'overview' ? "bg-indigo-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
          >
            <BarChart3 size={20} />
            <span>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-colors", activeTab === 'users' ? "bg-indigo-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
          >
            <Users size={20} />
            <span>Users</span>
          </button>
          <button 
            onClick={() => setActiveTab('content')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-colors", activeTab === 'content' ? "bg-indigo-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
          >
            <PlusSquare size={20} />
            <span>Content</span>
          </button>
          <button 
            onClick={() => setActiveTab('verification')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-colors", activeTab === 'verification' ? "bg-indigo-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
          >
            <CheckCircle2 size={20} />
            <span>Verification</span>
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn("w-full flex items-center gap-3 p-3 rounded-xl transition-colors", activeTab === 'reports' ? "bg-indigo-600 text-white" : "hover:bg-zinc-100 dark:hover:bg-zinc-800")}
          >
            <AlertCircle size={20} />
            <span>Reports</span>
          </button>
        </nav>
        <div className="p-4 border-t dark:border-zinc-800">
          <button onClick={logout} className="w-full flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
            <LogOut size={20} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <header className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold capitalize">{activeTab}</h2>
          <div className="flex items-center gap-4">
            <button className="p-2 glass rounded-full relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <Avatar size="sm" username={user?.username} />
          </div>
        </header>

        {activeTab === 'overview' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 glass rounded-3xl">
              <p className="text-zinc-500 text-sm mb-1">Total Users</p>
              <h3 className="text-4xl font-bold">{stats.totalUsers}</h3>
              <div className="mt-4 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 w-3/4"></div>
              </div>
            </div>
            <div className="p-6 glass rounded-3xl">
              <p className="text-zinc-500 text-sm mb-1">Verified Users</p>
              <h3 className="text-4xl font-bold">{stats.verifiedUsers}</h3>
              <div className="mt-4 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 w-1/4"></div>
              </div>
            </div>
            <div className="p-6 glass rounded-3xl">
              <p className="text-zinc-500 text-sm mb-1">Total Posts</p>
              <h3 className="text-4xl font-bold">{stats.totalPosts}</h3>
              <div className="mt-4 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-1/2"></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="glass rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t dark:border-zinc-800">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.profile_pic} username={u.username} size="sm" />
                        <div>
                          <p className="font-bold text-sm">{u.username}</p>
                          <p className="text-[10px] text-zinc-500">{u.full_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{u.email}</td>
                    <td className="p-4">
                      <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", u.is_suspended ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600")}>
                        {u.is_suspended ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm">Edit</Button>
                        <Button 
                          variant={u.is_suspended ? "primary" : "danger"} 
                          size="sm"
                          onClick={() => handleSuspend(u.id, !!u.is_suspended)}
                        >
                          {u.is_suspended ? 'Unsuspend' : 'Suspend'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="glass rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {verificationRequests.map(vr => (
                  <tr key={vr.id} className="border-t dark:border-zinc-800">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={vr.profile_pic} size="sm" />
                        <span className="font-bold text-sm">{vr.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{vr.full_name}</td>
                    <td className="p-4 text-sm">{new Date(vr.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button onClick={() => handleVerify(vr.user_id, 'approved')} className="bg-green-600 hover:bg-green-700" size="sm">Approve</Button>
                        <Button onClick={() => handleVerify(vr.user_id, 'rejected')} variant="danger" size="sm">Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {verificationRequests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-zinc-500">No pending verification requests.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="glass rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="p-4">Reporter</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id} className="border-t dark:border-zinc-800">
                    <td className="p-4 text-sm font-bold">{r.reporter_name}</td>
                    <td className="p-4 text-sm">{r.reason}</td>
                    <td className="p-4 text-sm">{new Date(r.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-600 rounded-full text-[10px] font-bold uppercase">Pending</span>
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-zinc-500">No reports found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'verification' && (
          <div className="glass rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-zinc-100 dark:bg-zinc-800">
                <tr>
                  <th className="p-4">User</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {verificationRequests.map(vr => (
                  <tr key={vr.id} className="border-t dark:border-zinc-800">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar src={vr.profile_pic} size="sm" />
                        <span className="font-bold text-sm">{vr.username}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{vr.full_name}</td>
                    <td className="p-4 text-sm">{new Date(vr.created_at).toLocaleDateString()}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button onClick={() => handleVerify(vr.user_id, 'approved')} className="bg-green-600 hover:bg-green-700" size="sm">Approve</Button>
                        <Button onClick={() => handleVerify(vr.user_id, 'rejected')} variant="danger" size="sm">Reject</Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {verificationRequests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-10 text-center text-zinc-500">No pending verification requests.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Layouts ---

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const navItems = [
    { icon: Home, path: '/', label: 'Home' },
    { icon: Search, path: '/search', label: 'Search' },
    { icon: PlusSquare, path: '/add', label: 'Add' },
    { icon: MessageCircle, path: '/chat', label: 'Chat' },
    { icon: UserIcon, path: '/profile', label: 'Profile' },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-16 glass z-40 flex items-center justify-between px-4">
        <Logo />
        <div className="flex items-center gap-4">
          <Link to="/notifications" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full relative">
            <Heart size={24} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </Link>
          <button onClick={() => navigate('/chat')} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
            <Send size={24} />
          </button>
        </div>
      </header>

      <main className="min-h-screen">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 glass z-40 flex items-center justify-around px-2">
        {navItems.map(item => (
          <button 
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              "p-3 rounded-2xl transition-all",
              location.pathname === item.path ? "text-indigo-600 scale-110" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            )}
          >
            {item.path === '/profile' ? (
              <Avatar 
                src={user?.profile_pic} 
                size="sm" 
                username={user?.username}
                className={cn(
                  "w-7 h-7 border-2 transition-all",
                  location.pathname === '/profile' ? "border-indigo-600" : "border-transparent"
                )} 
              />
            ) : (
              <item.icon size={26} fill={location.pathname === item.path ? "currentColor" : "none"} />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pixelgram_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('pixelgram_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('pixelgram_theme', theme);
  }, [theme]);

  const login = (u: User) => {
    setUser(u);
    localStorage.setItem('pixelgram_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('pixelgram_user');
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const newUser = { ...user, ...data };
      setUser(newUser);
      localStorage.setItem('pixelgram_user', JSON.stringify(newUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      <ThemeContext.Provider value={{ theme, toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') }}>
        <Router>
          <Routes>
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={user.is_admin ? "/admin" : "/"} />} />
            <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
            
            {/* User Routes */}
            <Route path="/" element={user ? (user.is_admin ? <Navigate to="/admin" /> : <MainLayout><FeedPage /></MainLayout>) : <Navigate to="/login" />} />
            <Route path="/search" element={user ? <MainLayout><SearchPage /></MainLayout> : <Navigate to="/login" />} />
            <Route path="/add" element={user ? <MainLayout><AddPostPage /></MainLayout> : <Navigate to="/login" />} />
            <Route path="/chat" element={user ? <MainLayout><ChatPage /></MainLayout> : <Navigate to="/login" />} />
            <Route path="/notifications" element={user ? <MainLayout><NotificationsPage /></MainLayout> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <MainLayout><ProfilePage /></MainLayout> : <Navigate to="/login" />} />
            <Route path="/profile/:userId" element={user ? <MainLayout><ProfilePage /></MainLayout> : <Navigate to="/login" />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={user?.is_admin ? <AdminDashboard /> : <Navigate to="/login" />} />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </ThemeContext.Provider>
    </AuthContext.Provider>
  );
}
