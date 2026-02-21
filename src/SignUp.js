import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./SignUp.css";
// Icons import
import { FiUser, FiPhone, FiMail } from "react-icons/fi";
// Toastify imports
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SignUp = () => {
  const navigate = useNavigate();

  // 👇 State me 'phoneNumber' use kiya hai taaki Backend se match ho
  const [formData, setFormData] = useState({
    username: "",
    phoneNumber: "", 
    email: ""
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1️⃣ VALIDATION
    if (formData.phoneNumber.length < 10) {
      toast.error("Please enter a valid 10-digit phone number! 📱", { theme: "dark" });

    localStorage.setItem("userName", formData.username);
      return;
    }

    try {
      // 2️⃣ API CALL TO BACKEND
      const response = await fetch("https://gupshup-backend-81q6.onrender.com/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ SUCCESS
        toast.success("Account Created Successfully! 🎉", { theme: "dark" });
        
        // Thoda wait karke Login page par bhejo
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // 🔴 FAIL (Jaise: Number pehle se register hai)
        toast.error(data.message || "Registration Failed ❌", { theme: "dark" });
      }
    } catch (error) {
      console.error("Signup Error:", error);
      toast.error("Server Error! Is Backend Running? ⚠️", { theme: "dark" });
    }
  };

  return (
    <div className="signup-container">
      {/* Toast Notification Container */}
      <ToastContainer />

      {/* LEFT SIDE */}
      <div className="signup-visuals">
        <div className="visual-content">
          <h1>Connect<br />Beyond Limits.</h1>
          <p>Experience the future of messaging with GupShup AI.</p>
          
          {/* Image */}
          <img 
            src="/signup-illustration.png"  // Make sure ye image public folder me ho
            alt="AI Robot" 
            className="signup-image" 
          />
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="signup-form-wrapper">
        <div className="glass-card">
          <div className="form-header">
            {/* Logo */}
            <img src="/logo1.png" alt="GupShup Logo" className="brand-logo" />
            <p>Create your account</p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Username */}
            <div className="input-box">
              <FiUser className="icon"/>
              <input 
                type="text" 
                name="username" 
                placeholder="User name" 
                value={formData.username}
                onChange={handleChange} 
                required 
              />
            </div>

            {/* Phone Number (Backend ke liye name="phoneNumber" zaroori hai) */}
            <div className="input-box">
              <FiPhone className="icon"/>
              <input 
                type="tel" 
                name="phoneNumber" 
                placeholder="Phone number" 
                value={formData.phoneNumber}
                onChange={handleChange} 
                required 
                maxLength="10"
              />
            </div>

            {/* Email (Optional) */}
            <div className="input-box">
              <FiMail className="icon"/>
              <input 
                type="email" 
                name="email" 
                placeholder="Email (Optional)" 
                value={formData.email}
                onChange={handleChange} 
              />
            </div>

            <button type="submit" className="glow-btn">Sign Up</button>
          </form>

          <div className="footer-text">
            Already have? <Link to="/login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;