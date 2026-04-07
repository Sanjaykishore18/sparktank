import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar/Navbar';
import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import DebatePage from './pages/Debate/DebatePage';
import DebateSession from './pages/Debate/DebateSession';
import TeamDebateSession from './pages/Debate/TeamDebateSession';
import IntroPage from './pages/Intro/IntroPage';
import PitchPage from './pages/Pitch/PitchPage';
import SocialPage from './pages/Social/SocialPage';
import SocialSession from './pages/Social/SocialSession';
import Leaderboard from './pages/Leaderboard/Leaderboard';
import Pricing from './pages/Pricing/Pricing';
import AvatarCreator from './pages/Avatar/AvatarCreator';

function ProtectedRoute({ children, premium }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" />;
  if (premium && user.plan !== 'premium') return <Navigate to="/pricing" />;
  
  return children;
}

export default function App() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/pricing" element={
          <ProtectedRoute><Pricing /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/debate" element={
          <ProtectedRoute><DebatePage /></ProtectedRoute>
        } />
        <Route path="/debate/session/:sessionId" element={
          <ProtectedRoute><DebateSession /></ProtectedRoute>
        } />
        <Route path="/debate/room/:roomId" element={
          <ProtectedRoute premium><TeamDebateSession /></ProtectedRoute>
        } />
        <Route path="/intro" element={
          <ProtectedRoute><IntroPage /></ProtectedRoute>
        } />
        <Route path="/pitch" element={
          <ProtectedRoute><PitchPage /></ProtectedRoute>
        } />
        <Route path="/social" element={
          <ProtectedRoute premium><SocialPage /></ProtectedRoute>
        } />
        <Route path="/social/session/:sessionId" element={
          <ProtectedRoute premium><SocialSession /></ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute><Leaderboard /></ProtectedRoute>
        } />
        <Route path="/avatar-creator" element={
          <ProtectedRoute><AvatarCreator /></ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
