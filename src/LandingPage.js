import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSend, FiX } from "react-icons/fi"; 
import './LandingPage.css';

const LandingPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('');

  // 🤖 AI CHAT WIDGET STATE
  const [showAIChat, setShowAIChat] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60); 
  const [inputMsg, setInputMsg] = useState("");
  const [replyCount, setReplyCount] = useState(0);
  const [messages, setMessages] = useState([
    { sender: 'AI', text: "Hi! I'm GupShup AI 🤖. Welcome to the future of messaging! What's your name?" }
  ]);
  const chatEndRef = useRef(null);

  // ⏱️ Hidden Timer Logic
  useEffect(() => {
    let timer;
    if (showAIChat && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (showAIChat && timeLeft === 0) {
      setMessages(prev => [...prev, { sender: 'AI', text: "Oops! Your 60-second free demo is over ⏰. Let's get you a free account to continue chatting!" }]);
      setTimeout(() => {
        navigate('/signup'); 
      }, 2500); 
    }
    return () => clearInterval(timer);
  }, [showAIChat, timeLeft, navigate]);

  // ⬇️ Auto Scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 🧠 AI Response Logic
  const aiResponses = [
    "That's awesome! Did you know GupShup uses WebSockets for zero-lag messaging? ⚡",
    "I agree! Plus, everything here is perfectly secure. 🛡️",
    "You type fast! GupShup is built for speed and premium design. 🎨",
    "Haha exactly! Our UI is inspired by neon cyberpunk vibes. ✨",
    "It's great talking to you! The app has a lot more features to explore."
  ];

  const handleSendAIMessage = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    setMessages(prev => [...prev, { sender: 'User', text: inputMsg }]);
    setInputMsg("");

    setTimeout(() => {
      setMessages(prev => [...prev, {
        sender: 'AI',
        text: aiResponses[replyCount % aiResponses.length]
      }]);
      setReplyCount(prev => prev + 1);
    }, 800);
  };

  // Contact Form Logic 
  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setStatus('Sending...'); 
    try {
      const response = await fetch('https://gupshup-backend-81q6.onrender.com/api/contact/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setStatus('✅ Message sent successfully! We will contact you soon.');
        setFormData({ name: '', email: '', message: '' }); 
        setTimeout(() => setStatus(''), 2000);
      } else {
        setStatus('❌ Failed to send message. Please try again.');
        setTimeout(() => setStatus(''), 2000);
      }
    } catch (error) {
      console.error('Error:', error);
      setStatus('❌ Server Error. Please make sure backend is running.');
      setTimeout(() => setStatus(''), 2000);
    }
  };

  // 🟢 Scroll Reveal Animation
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active'); 
        }
      });
    }, { threshold: 0.1 }); 

    const hiddenElements = document.querySelectorAll('.reveal');
    hiddenElements.forEach((el) => observer.observe(el));

    return () => {
      hiddenElements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  return (
    <div className="landing-container">
      
      {/* 🤖 AI CHAT WIDGET */}
      {showAIChat && (
        <div className="ai-chat-widget fade-in-up">
          <div className="ai-chat-header">
            <div className="ai-info">
              <h4>🤖 GupShup AI</h4>
              <span className="timer-text" style={{color: '#00e676', fontWeight: '500'}}>🟢 Online</span>
            </div>
            <button className="close-ai" onClick={() => setShowAIChat(false)}><FiX /></button>
          </div>
          
          <div className="ai-chat-body">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg-bubble ${m.sender === 'AI' ? 'ai' : 'user'}`}>
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <form className="ai-chat-footer" onSubmit={handleSendAIMessage}>
            <input 
              autoFocus 
              value={inputMsg} 
              onChange={e => setInputMsg(e.target.value)} 
              placeholder="Type a message..." 
              disabled={timeLeft === 0}
            />
            <button type="submit" disabled={timeLeft === 0}><FiSend /></button>
          </form>
        </div>
      )}

      {/* 🎨 Static Blobs */}
      <div className="blob blob-1 float-animation"></div>
      <div className="blob blob-2 float-animation-delayed"></div>
      <div className="blob blob-3 float-animation"></div>

      {/* 🟢 Navbar (Get Started Removed) */}
      <nav className="navbar fade-in-down">
        <div className="logo">
          <img src="/logo.png" alt="GupShup Logo" className="logo-img" onError={(e) => e.target.src = '/favicon.ico'} /> 
          <span className="logo-text">GupShup</span>
        </div>
        <ul className="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#faqs">FAQs</a></li>
          <li><a href="#contact">Contact</a></li>
        </ul>
        <div className="nav-buttons">
            <button className="btn-login" onClick={() => navigate('/login')}>Log In</button>
            {/* Get Started removed from here */}
        </div>
      </nav>

      {/* 🔵 Hero Section */}
      <header className="hero-section">
        <div className="hero-content fade-in-up">
          <div className="badge">⚡ New: AI Powered Chat</div>
          <h1>Connect with Friends <br /> <span className="text-gradient">Beyond Limits.</span></h1>
          <p>Experience the fastest, most secure way to chat. End-to-end encryption, neon-speed performance, and zero lag.</p>
          
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => navigate('/signup')}>Start Chatting Here</button>
            <button className="btn-secondary" onClick={() => { setShowAIChat(true); setTimeLeft(60); }}>View Demo</button>
          </div>
          
          <div className="stats reveal">
            <div><strong>10k+</strong><br/>Users</div>
            <div className="separator"></div>
            <div><strong>50M+</strong><br/>Messages</div>
            <div className="separator"></div>
            <div><strong>4.9/5</strong><br/>Rating</div>
          </div>
        </div>
        
        <div className="hero-image-wrapper fade-in-up" style={{ animationDelay: '0.2s' }}>
          <img src="/hero.png" alt="App Interface" className="hero-img floating-img" />
        </div>
      </header>

      {/* 🌟 Features Section */}
      <section id="features" className="section-container">
        <h2 className="section-title reveal">Why Choose <span className="text-gradient">GupShup?</span></h2>
        <div className="features-grid">
          <div className="feature-card reveal">
            <div className="icon-box">💬</div>
            <h3>Real-Time Sync</h3>
            <p>Messages delivered faster than you can blink using advanced WebSocket technology.</p>
          </div>
          <div className="feature-card reveal">
            <div className="icon-box">🛡️</div>
            <h3>Secure & Private</h3>
            <p>End-to-end encryption ensures only you and the recipient can read messages.</p>
          </div>
          <div className="feature-card reveal">
            <div className="icon-box">⚡</div>
            <h3>Lightning Fast</h3>
            <p>Optimized performance ensures the app runs smoothly on any device, anywhere.</p>
          </div>
        </div>
      </section>

      {/* ❓ FAQ Section */}
      <section id="faqs" className="section-container">
        <h2 className="section-title reveal">Frequently Asked <span className="text-gradient">Questions</span></h2>
        <div className="faq-grid">
            <div className="faq-item reveal">
                <h4>Is GupShup really free?</h4>
                <p>Yes! Our Starter plan is completely free forever. You get unlimited messaging without paying a dime.</p>
            </div>
            <div className="faq-item reveal">
                <h4>Is my data secure?</h4>
                <p>Absolutely. We use military-grade end-to-end encryption. Even we cannot read your messages.</p>
            </div>
            <div className="faq-item reveal">
                <h4>Can I use it on multiple devices?</h4>
                <p>Yes, GupShup syncs seamlessly across your phone, tablet, and desktop computer.</p>
            </div>
            <div className="faq-item reveal">
                <h4>How do I enable Dark Mode?</h4>
                <p>GupShup is built in Dark Mode by default for that premium neon feel! You can customize themes in Settings.</p>
            </div>
        </div>
      </section>

      {/* 📞 CONTACT FORM SECTION */}
      <section id="contact" className="section-container contact-wrapper reveal">
        <div className="contact-box">
            <h2>Get in <span className="text-gradient">Touch</span></h2>
            <p>Have questions or feedback? Fill out the form below.</p>
            
            <form className="contact-form" onSubmit={handleContactSubmit}>
                <div className="input-group">
                    <input type="text" name="name" placeholder="Your Name" required value={formData.name} onChange={handleChange} />
                </div>
                <div className="input-group">
                    <input type="email" name="email" placeholder="Your Email" required value={formData.email} onChange={handleChange} />
                </div>
                <div className="input-group">
                    <textarea name="message" placeholder="Your Message" rows="4" required value={formData.message} onChange={handleChange}></textarea>
                </div>
                
                <button type="submit" className="btn-primary full-width hover-lift" disabled={status === 'Sending...'}>
                    {status === 'Sending...' ? 'Sending...' : 'Send Message 🚀'}
                </button>
                {status && <p style={{ marginTop: '15px', color: status.includes('✅') ? '#00e676' : '#ef5350', textAlign: 'center' }}>{status}</p>}
            </form>
        </div>
      </section>

      {/* 👇 Footer */}
      <footer className="footer reveal">
        <div className="footer-content">
            <div className="footer-brand">
                <div className="logo" style={{justifyContent: 'flex-start', marginBottom: '10px'}}>
                    <img src="/logo.png" alt="Logo" className="logo-img" onError={(e) => e.target.src = '/favicon.ico'} />
                    <span className="logo-text">GupShup</span>
                </div>
                <p>Connecting the world, one neon message at a time. Secure, fast, and built for the future.</p>
            </div>
            <div className="footer-links-col">
                <h4>Product</h4>
                <a href="#features">Features</a>
                <a href="/chat">Web App</a>
                <a href="/">Download</a>
            </div>
            <div className="footer-links-col">
                <h4>Company</h4>
                <a href="#contact">Contact</a>
                <a href="/">About Us</a>
                <a href="/">Careers</a>
            </div>
            <div className="footer-links-col">
                <h4>Legal</h4>
                <a href="/">Privacy Policy</a>
                <a href="/">Terms of Service</a>
                <div className="social-icons">
                    <span>🐦</span><span>📸</span><span>💼</span>
                </div>
            </div>
        </div>
        <div className="footer-bottom">
            <p>© 2026 GupShup Inc. All rights reserved. Made with ⚡ in India.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;