import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import SignUp from './SignUp';
import Login from './Login';
import ChatRoom from './ChatRoom';

// 👇 1. PROTECTED ROUTE (Suraksha Kawach)
// Ye check karega ki user login hai ya nahi via LocalStorage
const ProtectedRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("userToken"); // Token check
  
  if (!isLoggedIn) {
    // Agar login nahi hai, to Login page par bhej do
    return <Navigate to="/login" replace />; 
  }
  return children; // Agar login hai, to Chat dikhao
};

// 👇 2. PUBLIC ROUTE
// Agar user pehle se login hai, to use Login/Signup page mat dikhao, seedha Chat par bhejo
const PublicRoute = ({ children }) => {
  const isLoggedIn = localStorage.getItem("userToken");
  
  if (isLoggedIn) {
    return <Navigate to="/chat" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Home Page: Landing Page (Sabke liye khula hai) */}
        <Route path="/" element={<LandingPage />} />

        {/* Signup Page (Sirf bina login wale logo ke liye) */}
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignUp />
            </PublicRoute>
          } 
        />

         {/* Login Page (Sirf bina login wale logo ke liye) */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Chat Page (SURAKSHIT - Sirf Login users ke liye) */}
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatRoom />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;