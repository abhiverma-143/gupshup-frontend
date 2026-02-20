import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css"; 
import { FiPhone, FiLock, FiArrowRight } from "react-icons/fi";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Login = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // 1️⃣ HANDLE PHONE SUBMIT (Send OTP API)
  // 1️⃣ HANDLE PHONE SUBMIT (Step 1)
  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (phone.length < 10) {
      toast.error("Please enter a valid 10-digit number! 📱", { theme: "dark" });
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch("http://localhost:8081/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone })
      });

      const data = await response.json();

      if (response.ok) {
        // ✅ User Mila -> OTP Sent
        setLoading(false);
        setStep(2);
        toast.success(`OTP Sent Successfully! 🚀`, { theme: "dark" });
        console.log("Check Backend Terminal for OTP"); 
      } else if (response.status === 404) {
        // ❌ User Nahi Mila -> Redirect to Signup
        setLoading(false);
        
        toast.info("Number not registered! Redirecting to Signup... 📝", { 
            theme: "dark", 
            autoClose: 2000 
        });

        // 👇 2 Second baad Signup page par bhejo
        setTimeout(() => {
            navigate('/signup');
        }, 2000);

      } else {
        // Koi aur error
        setLoading(false);
        toast.error(data.message || "Failed to send OTP ❌", { theme: "dark" });
      }
    } catch (error) {
      setLoading(false);
      console.error("API Error:", error);
      toast.error("Server error! Is Backend running? ⚠️", { theme: "dark" });
    }
  };

  // 2️⃣ HANDLE OTP VERIFY (Verify API)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 👇 Backend API Call
      const response = await fetch("http://localhost:8081/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phone, otp: otp })
      });

      const data = await response.json(); // ✅ Ab hum is 'data' ko niche use karenge

      if (response.ok) {
        // ✅ Login Success
        // Backend se aaya message use kar rahe hain (data.message)
        toast.success(data.message || "Login Successful! Welcome 🎉", { theme: "dark" });
        
        localStorage.setItem("userToken", "logged_in"); // Ye batayega ki user login hai
        localStorage.setItem("userPhone", phone); 

        setTimeout(() => {
            navigate("/chat"); 
        }, 1000);
      } else {
        // 🔴 Login Failed
        setLoading(false);
        // Backend ka error message dikhayenge
        toast.error(data.message || "Invalid OTP! Please try again ❌", { theme: "dark" });
      }
    } catch (error) {
      setLoading(false);
      toast.error("Connection Failed! ⚠️", { theme: "dark" });
    }
  };

  return (
    <div className="login-container">
      <ToastContainer />

      {/* LEFT SIDE: Visuals */}
      <div className="login-visuals">
        <div className="visual-content">
          <h1>Welcome<br />Back!</h1>
          <p>Login to continue your conversation.</p>
          <img src="/signup-illustration.png" alt="AI Robot" className="login-image" />
        </div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="login-form-wrapper">
        <div className="glass-card">
          
          <div className="form-header">
            <img src="/logo1.png" alt="GupShup Logo" className="brand-logo" />
            <p>{step === 1 ? "Enter your mobile number" : `OTP sent to +91 ${phone}`}</p>
          </div>

          {/* --- STEP 1: PHONE NUMBER --- */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="fade-in">
              <div className="input-box">
                <FiPhone className="icon" />
                <input 
                  type="tel" 
                  placeholder="Mobile Number" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required 
                  maxLength="10"
                />
              </div>
              
              <button type="submit" className="glow-btn" disabled={loading}>
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* --- STEP 2: OTP --- */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="fade-in">
              <div className="input-box otp-box">
                <FiLock className="icon" />
                <input 
                  type="text" 
                  placeholder="Enter 6-digit OTP" 
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required 
                  maxLength="6"
                  style={{ letterSpacing: "5px", textAlign: "center", fontWeight: "bold" }}
                />
              </div>

              <button type="submit" className="glow-btn" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Login"} <FiArrowRight />
              </button>

              <div className="resend-text">
                Didn't receive? <span onClick={() => setStep(1)} style={{marginLeft: '5px', color: '#d946ef', cursor: "pointer"}}>Change Number</span>
              </div>
            </form>
          )}

          <div className="footer-text">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;