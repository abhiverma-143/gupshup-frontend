import React, { useState, useEffect, useRef } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import EmojiPicker from 'emoji-picker-react';
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './Chat.css'; 

import { FiSearch, FiMoreVertical, FiPlus, FiX, FiLogOut, FiEdit2, FiCamera, FiUser, FiInfo, FiPhone, FiSend, FiSmile, FiArrowLeft, FiTrash2, FiPaperclip, FiFileText, FiMic, FiTrash, FiPlay, FiPause, FiMapPin, FiUsers } from "react-icons/fi"; 

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.m4a';
const SOCKET_URL = 'https://gupshup-backend-81q6.onrender.com/ws';

let stompClient = null;
let isConnecting = false;

// ==========================================
// 🎵 CUSTOM VOICE PLAYER COMPONENT 
// ==========================================
const VoicePlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState("0:00");
    const audioRef = useRef(null);

    const togglePlay = () => { if (isPlaying) audioRef.current.pause(); else audioRef.current.play(); setIsPlaying(!isPlaying); };
    const handleTimeUpdate = () => { const current = audioRef.current.currentTime; const total = audioRef.current.duration; if (total) { setProgress((current / total) * 100); setDuration(formatTime(current)); } };
    const handleLoadedMetadata = () => { setDuration(formatTime(audioRef.current.duration)); };
    const handleEnded = () => { setIsPlaying(false); setProgress(0); setDuration(formatTime(audioRef.current.duration)); };
    const handleSeek = (e) => { const seekTo = (e.target.value / 100) * audioRef.current.duration; audioRef.current.currentTime = seekTo; setProgress(e.target.value); };

    const formatTime = (secs) => { if (!secs || isNaN(secs)) return "0:00"; const m = Math.floor(secs / 60); const s = Math.floor(secs % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; };

    return (
        <div className="custom-voice-player">
            <button className="play-pause-btn" onClick={togglePlay}>{isPlaying ? <FiPause /> : <FiPlay style={{marginLeft: '2px'}} />}</button>
            <div className="voice-waveform"><input type="range" className="voice-slider" min="0" max="100" value={progress} onChange={handleSeek} /></div>
            <span className="voice-time">{duration}</span>
            <audio ref={audioRef} src={src} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} />
        </div>
    );
};

// ==========================================
// 💬 MAIN CHATROOM COMPONENT
// ==========================================
const ChatRoom = () => {
    const navigate = useNavigate();
    
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const attachmentRef = useRef(null); 
    const audioRef = useRef(new Audio(NOTIFICATION_SOUND));
    const phoneRef = useRef(localStorage.getItem("userPhone") || ""); 
    const currentChatRef = useRef("CHATROOM"); 
    const typingTimeouts = useRef({}); 

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerIntervalRef = useRef(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const [user, setUser] = useState({ name: localStorage.getItem("userName") || "", phone: localStorage.getItem("userPhone") || "", connected: false, msg: '' });
    const [avatar, setAvatar] = useState("");
    const [about, setAbout] = useState("Hey there! I am using GupShup.");
    const [publicChats, setPublicChats] = useState([]);
    const [privateChats, setPrivateChats] = useState(new Map());
    const [onlineUsers, setOnlineUsers] = useState(new Set(["GupShup AI"]));
    const [typingUsers, setTypingUsers] = useState({}); 
    const [selectedMsgId, setSelectedMsgId] = useState(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);

    const [contacts, setContacts] = useState(() => {
        const savedContacts = localStorage.getItem("savedContacts");
        const initialSet = savedContacts ? new Set(JSON.parse(savedContacts)) : new Set();
        initialSet.add("GupShup AI"); 
        return initialSet;
    });

    const [contactNames, setContactNames] = useState(() => {
        const savedNames = localStorage.getItem("contactNames");
        return savedNames ? JSON.parse(savedNames) : { "GupShup AI": "GupShup AI" };
    });

    const [currentChat, setCurrentChat] = useState("CHATROOM");
    const [search, setSearch] = useState("");
    const [isMobileChatOpen, setIsMobileChatOpen] = useState(false); 
    const [showEmoji, setShowEmoji] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showMenu, setShowMenu] = useState(false); 
    
    const [newContactPhone, setNewContactPhone] = useState("");
    const [newContactName, setNewContactName] = useState("");

    const getDisplayName = (phoneNum) => {
        if (phoneNum === "CHATROOM") return "Public Lounge";
        return contactNames[phoneNum] || phoneNum;
    };

    const showPushNotification = (senderName, messageContent, chatRoomId) => {
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            let notificationBody = messageContent;
            if (messageContent.startsWith("IMAGE::")) notificationBody = "📷 Photo";
            else if (messageContent.startsWith("AUDIO::")) notificationBody = "🎤 Voice Message";
            else if (messageContent.startsWith("FILE::")) notificationBody = "📄 Document";
            else if (messageContent.startsWith("LOCATION::")) notificationBody = "📍 Shared a Location";

            const notification = new Notification(`New message from ${senderName}`, {
                body: notificationBody,
                icon: 'https://cdn-icons-png.flaticon.com/512/1041/1041916.png' 
            });

            notification.onclick = () => {
                window.focus();
                setCurrentChat(chatRoomId);
            };
        }
    };

    useEffect(() => { currentChatRef.current = currentChat; }, [currentChat]);

    useEffect(() => {
        const token = localStorage.getItem("userToken");
        const phone = localStorage.getItem("userPhone");
        const lastActivity = localStorage.getItem("lastActivity"); // 👈 Check last active time

        if (!token || !phone) { navigate("/login"); return; }

        // 👇 5 DAY EXPIRATION LOGIC 🚀
        const currentTime = new Date().getTime();
        const fiveDaysInMillis = 5 * 24 * 60 * 60 * 1000; // 5 Din milliseconds mein

        if (lastActivity) {
            if (currentTime - parseInt(lastActivity) > fiveDaysInMillis) {
                // Agar 5 din se zyada ho gaye, to logout kar do
                localStorage.clear();
                toast.error("Session expired! Please login again. 🔒", { theme: "dark" });
                navigate("/login");
                return; // Yahan se aage mat badho
            }
        }
        // Agar user andar aa gaya (5 din ke andar), to uska timer wapas reset kar do
        localStorage.setItem("lastActivity", currentTime.toString());
        
        phoneRef.current = phone;
        const savedAvatar = localStorage.getItem("userAvatar");
        setAvatar(savedAvatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.name}`);
        
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }

        connect();
        return () => { if (stompClient) { stompClient.disconnect(); stompClient = null; isConnecting = false; } };
        // eslint-disable-next-line
    }, []);

    const connect = () => {
        if (stompClient && stompClient.connected) return;
        if (isConnecting) return; 
        isConnecting = true;
        const socket = new SockJS(SOCKET_URL);
        stompClient = Stomp.over(socket);
        stompClient.debug = () => {}; 
        stompClient.connect({}, onConnected, onError);
    };

    const onConnected = () => {
        isConnecting = false;
        setUser(prev => ({ ...prev, connected: true }));
        stompClient.subscribe('/topic/public', onMessageReceived);
        stompClient.subscribe(`/user/${phoneRef.current}/private`, onPrivateMessage);
        stompClient.send("/app/chat.addUser", {}, JSON.stringify({ sender: phoneRef.current, type: 'JOIN' }));
    };

    const onError = (err) => { isConnecting = false; };

    const isDuplicate = (currentList, newMessage) => {
        if (currentList.length === 0) return false;
        return currentList.slice(-5).some(msg => msg.sender === newMessage.sender && msg.content === newMessage.content && msg.timestamp === newMessage.timestamp);
    };

    const onMessageReceived = (payload) => {
        const data = JSON.parse(payload.body);
        if (data.type === 'JOIN') { setOnlineUsers(prev => new Set(prev).add(data.sender)); return; }
        if (data.type === 'LEAVE') { setOnlineUsers(prev => { const newSet = new Set(prev); newSet.delete(data.sender); return newSet; }); return; }
        if (data.type === 'TYPING') {
            if (data.sender !== phoneRef.current) {
                setTypingUsers(prev => ({ ...prev, CHATROOM: `${getDisplayName(data.sender)} is typing...` }));
                if (typingTimeouts.current['CHATROOM']) clearTimeout(typingTimeouts.current['CHATROOM']);
                typingTimeouts.current['CHATROOM'] = setTimeout(() => { setTypingUsers(prev => ({ ...prev, CHATROOM: null })); }, 2000);
            }
            return;
        }

        if (data.type === 'CHAT' && data.content && data.content.startsWith("DELETE::")) {
            const timestampToDelete = data.content.replace("DELETE::", "");
            setPublicChats(prev => prev.filter(m => m.timestamp !== timestampToDelete));
            return;
        }

        if (data.sender && data.sender.trim() === phoneRef.current.trim()) return;
        setPublicChats(prev => {
            if (isDuplicate(prev, data)) return prev; 
            if (currentChatRef.current !== "CHATROOM") playSound();
            showPushNotification(`Public Lounge (${getDisplayName(data.sender)})`, data.content, "CHATROOM");
            return [...prev, data];
        });
    };

    const onPrivateMessage = (payload) => {
        const data = JSON.parse(payload.body);
        const sender = data.sender; 

        if (data.type === 'SEEN' || data.type === 'DELIVERED') {
            setPrivateChats(prev => {
                const newMap = new Map(prev);
                const msgs = newMap.get(sender) || [];
                const updatedMsgs = msgs.map(msg => { if (msg.sender === phoneRef.current) { return { ...msg, status: data.type }; } return msg; });
                newMap.set(sender, updatedMsgs);
                return newMap;
            });
            return;
        }

        if (data.type === 'CHAT' && data.content && data.content.startsWith("DELETE::")) {
            const timestampToDelete = data.content.replace("DELETE::", "");
            setPrivateChats(prev => {
                const newMap = new Map(prev);
                const msgs = newMap.get(sender) || [];
                newMap.set(sender, msgs.filter(m => m.timestamp !== timestampToDelete));
                return newMap;
            });
            return;
        }

        if (sender && sender.trim() === phoneRef.current.trim()) return;

        if (data.type === 'TYPING') {
            setTypingUsers(prev => ({ ...prev, [sender]: 'typing...' }));
            if (typingTimeouts.current[sender]) clearTimeout(typingTimeouts.current[sender]);
            typingTimeouts.current[sender] = setTimeout(() => { setTypingUsers(prev => ({ ...prev, [sender]: null })); }, 2000);
            return;
        }

        setContacts(prev => {
            const newSet = new Set(prev);
            if (!newSet.has(sender)) { newSet.add(sender); localStorage.setItem("savedContacts", JSON.stringify([...newSet])); }
            return newSet;
        });
        
        setOnlineUsers(prev => new Set(prev).add(sender));

        setPrivateChats(prev => {
            const newMap = new Map(prev);
            const list = newMap.get(sender) || [];
            if (isDuplicate(list, data)) return prev;
            list.push(data);
            newMap.set(sender, list);
            return newMap;
        });

        if (currentChatRef.current === sender) { 
            sendTickStatus(sender, "SEEN"); 
        } else { 
            playSound(); 
            sendTickStatus(sender, "DELIVERED"); 
            showPushNotification(getDisplayName(sender), data.content, sender);
        }
    };

    const sendTickStatus = (receiverName, statusType) => {
        if (stompClient && stompClient.connected) {
            const statusMsg = { sender: phoneRef.current.trim(), receiver: receiverName, type: statusType, content: "" };
            stompClient.send("/app/chat.private", {}, JSON.stringify(statusMsg));
        }
    };

    const fetchChatHistory = async (contactPhone) => {
        try {
            const response = await fetch(`https://gupshup-backend-81q6.onrender.com/api/messages/${phoneRef.current}/${contactPhone}`);
            if (response.ok) {
                const history = await response.json();
                setPrivateChats(prev => {
                    const newMap = new Map(prev);
                    newMap.set(contactPhone, history); 
                    return newMap;
                });
            }
        } catch (error) { console.error("Failed to load chat history", error); }
    };

    useEffect(() => {
        setUser(prev => ({ ...prev, msg: '' })); 

        if (currentChat !== "CHATROOM") { 
            fetchChatHistory(currentChat);
            if (stompClient && stompClient.connected) { sendTickStatus(currentChat, "SEEN"); }
        }
    // eslint-disable-next-line
    }, [currentChat]);

    const handleTyping = (e) => {
        setUser(p => ({ ...p, msg: e.target.value }));
        
        if (!typingTimeouts.current['my_typing']) {
            if (stompClient && stompClient.connected) {
                const typingMsg = { sender: phoneRef.current.trim(), type: 'TYPING', content: "" };
                if (currentChat === "CHATROOM") { stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(typingMsg)); } 
                else { typingMsg.receiver = currentChat; stompClient.send("/app/chat.private", {}, JSON.stringify(typingMsg)); }
            }
            
            typingTimeouts.current['my_typing'] = setTimeout(() => {
                typingTimeouts.current['my_typing'] = null;
            }, 1500); 
        }
    };

    const executeSendMessage = (messageContent) => {
        if (!stompClient || !stompClient.connected) {
            toast.error("Connecting to server... Please wait");
            connect();
            return;
        }
        
        const chatMessage = { sender: phoneRef.current.trim(), content: messageContent, type: "CHAT", status: "SENT", timestamp: new Date().toISOString() };
        try {
            if (currentChat === "CHATROOM") {
                setPublicChats(prev => [...prev, chatMessage]);
                stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            } else {
                chatMessage.receiver = currentChat;
                setPrivateChats(prev => {
                    const newMap = new Map(prev);
                    if (!newMap.get(currentChat)) newMap.set(currentChat, []);
                    newMap.get(currentChat).push(chatMessage);
                    return newMap;
                });
                stompClient.send("/app/chat.private", {}, JSON.stringify(chatMessage));
            }
        } catch (e) { toast.error("Message not sent"); }
    }

    const sendMessage = () => { 
        if (!user.msg.trim()) return; 
        executeSendMessage(user.msg); 
        setUser(prev => ({ ...prev, msg: "" })); 
        setShowEmoji(false); 
    };

    const handleDeleteMessage = (msgToDelete) => {
        if (currentChat === "CHATROOM") setPublicChats(prev => prev.filter(m => m.timestamp !== msgToDelete.timestamp));
        else setPrivateChats(prev => { const newMap = new Map(prev); const list = newMap.get(currentChat) || []; newMap.set(currentChat, list.filter(m => m.timestamp !== msgToDelete.timestamp)); return newMap; });
        if (stompClient && stompClient.connected) {
            const deleteSignal = { sender: phoneRef.current.trim(), receiver: currentChat === "CHATROOM" ? null : currentChat, content: `DELETE::${msgToDelete.timestamp}`, type: 'CHAT' };
            if (currentChat === "CHATROOM") stompClient.send("/app/chat.sendMessage", {}, JSON.stringify(deleteSignal)); 
            else stompClient.send("/app/chat.private", {}, JSON.stringify(deleteSignal));
        }
        setSelectedMsgId(null);
    };

    const handleAttachmentUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 20 * 1024 * 1024) { toast.error("File size must be less than 20MB"); return; }
        const formData = new FormData(); formData.append("file", file);
        try {
            const response = await fetch('https://gupshup-backend-81q6.onrender.com/api/files/upload', { method: 'POST', body: formData });
            if (response.ok) {
                const data = await response.json();
                const fileUrl = data.fileUrl;
                const isImage = file.type.startsWith('image/');
                executeSendMessage(isImage ? `IMAGE::${fileUrl}` : `FILE::${file.name}::${fileUrl}`);
            } else { toast.error("Upload failed!"); }
        } catch (error) { toast.error("Server Error!"); }
        e.target.value = null; 
    };

    const sendLocation = () => {
        setShowAttachMenu(false);
        if (!navigator.geolocation) { toast.error("Geolocation is not supported"); return; }
        toast.info("Fetching your location...");
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            const locationUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
            executeSendMessage(`LOCATION::${locationUrl}`);
        }, () => { toast.error("Unable to retrieve location. Allow GPS."); });
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current); 
                if (audioBlob.size === 0) { toast.error("Recording is too short!"); return; }
                const audioFile = new File([audioBlob], `voice_${Date.now()}.mp3`, { type: audioBlob.type || 'audio/mpeg' });
                stream.getTracks().forEach(track => track.stop()); 
                await uploadAudioFile(audioFile);
            };
            mediaRecorder.start(); setIsRecording(true); setRecordingTime(0);
            timerIntervalRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
        } catch (err) { toast.error("Microphone permission denied!"); }
    };

    const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); clearInterval(timerIntervalRef.current); } };
    const cancelRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop()); setIsRecording(false); clearInterval(timerIntervalRef.current); audioChunksRef.current = []; } };

    const uploadAudioFile = async (file) => {
        const formData = new FormData(); formData.append("file", file);
        try {
            const response = await fetch('https://gupshup-backend-81q6.onrender.com/api/files/upload', { method: 'POST', body: formData });
            if (response.ok) { const data = await response.json(); executeSendMessage(`AUDIO::${data.fileUrl}`); } 
            else { toast.error("Failed to send audio!"); }
        } catch (error) { toast.error("Server Error!"); }
    };

    const formatTime = (secs) => { const m = Math.floor(secs / 60); const s = secs % 60; return `${m}:${s < 10 ? '0' : ''}${s}`; };
    const renderMessageContent = (content) => {
        if (!content) return null;
        if (content.startsWith("IMAGE::")) return <img src={content.replace("IMAGE::", "")} alt="Sent attachment" className="chat-uploaded-image" onClick={() => window.open(content.replace("IMAGE::", ""), '_blank')} />;
        if (content.startsWith("FILE::")) {
            const parts = content.split("::");
            return <div className="chat-file-card" onClick={() => window.open(parts[2], '_blank')}><div className="file-icon-box"><FiFileText /></div><div className="file-details"><span className="file-name" title={parts[1]}>{parts[1]}</span><span className="file-size">Document • Click to Open</span></div></div>;
        }
        if (content.startsWith("AUDIO::")) return <VoicePlayer src={content.replace("AUDIO::", "")} />;
        if (content.startsWith("LOCATION::")) return <div className="chat-location-card" onClick={() => window.open(content.replace("LOCATION::", ""), '_blank')}><div className="location-map-preview"><FiMapPin className="pin-icon" /></div><div className="location-info"><span className="loc-title">Current Location</span><span className="loc-subtitle">Click to view on Google Maps</span></div></div>;
        return <p className="chat-text-content">{content}</p>;
    }

    const handleImportContacts = async () => {
        if (!('contacts' in navigator && 'ContactsManager' in window)) {
            toast.error("Phonebook sync is not supported on this browser/device. Please add manually.");
            return;
        }
        try {
            const props = ['name', 'tel'];
            const opts = { multiple: true };
            const selectedContacts = await navigator.contacts.select(props, opts);
            
            if (selectedContacts.length > 0) {
                let importedCount = 0;
                const newContactsSet = new Set(contacts);
                const newNamesObj = { ...contactNames };

                selectedContacts.forEach(contact => {
                    if (contact.tel && contact.tel.length > 0) {
                        let phone = contact.tel[0].replace(/[\s-]/g, '');
                        let name = (contact.name && contact.name.length > 0) ? contact.name[0] : phone;
                        
                        newContactsSet.add(phone);
                        newNamesObj[phone] = name;
                        importedCount++;
                    }
                });

                setContacts(newContactsSet);
                setContactNames(newNamesObj);
                localStorage.setItem("savedContacts", JSON.stringify([...newContactsSet]));
                localStorage.setItem("contactNames", JSON.stringify(newNamesObj));
                
                toast.success(`${importedCount} Contacts Imported successfully!`);
                setShowAddModal(false);
            }
        } catch (error) { toast.error("Permission denied or cancelled."); }
    };

    const handleAddContact = (e) => { 
        e.preventDefault(); 
        if (!newContactPhone.trim()) { toast.error("Please enter a valid number"); return; } 
        
        const phone = newContactPhone.trim();
        const name = newContactName.trim() || phone;

        setContacts(prev => { 
            const newSet = new Set(prev); 
            newSet.add(phone); 
            localStorage.setItem("savedContacts", JSON.stringify([...newSet])); 
            return newSet; 
        }); 

        setContactNames(prev => {
            const newNames = { ...prev, [phone]: name };
            localStorage.setItem("contactNames", JSON.stringify(newNames));
            return newNames;
        });

        setCurrentChat(phone); 
        setNewContactPhone(""); 
        setNewContactName("");
        setShowAddModal(false); 
        toast.success("Contact added!"); 
    };
    
    const playSound = () => audioRef.current.play().catch(() => {});
    const handleImageUpload = (e) => { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setAvatar(reader.result); localStorage.setItem("userAvatar", reader.result); }; reader.readAsDataURL(file); } };
    const handleLogout = () => { if(stompClient) { stompClient.disconnect(); stompClient = null; isConnecting = false; } localStorage.clear(); navigate("/login"); };
    
    const handleClearChat = () => { 
        if(currentChat === "CHATROOM") {
            setPublicChats([]); 
        } else {
            setPrivateChats(prev => { 
                const n = new Map(prev); 
                n.set(currentChat, []); 
                return n; 
            }); 
        }
        setShowMenu(false); 
    };

    const handleSaveProfile = (e) => { e.preventDefault(); localStorage.setItem("userName", user.name); window.location.reload(); };

    const filteredContacts = [...contacts].filter(contact => 
        getDisplayName(contact).toLowerCase().includes(search.toLowerCase()) || 
        contact.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => { 
        const isMobile = window.innerWidth <= 768;
        if (isMobile && !isMobileChatOpen) return; 
        
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }, [publicChats, privateChats, currentChat, typingUsers, isMobileChatOpen]);

    return (
        <div className="app-container dark-theme">
            <ToastContainer />
            <div className="chat-layout">
                {/* SIDEBAR */}
                <div className={`sidebar ${isMobileChatOpen ? 'hidden-mobile' : ''}`}>
                    <div className="sidebar-header">
                        <div className="user-profile" onClick={() => setShowProfileModal(true)} title="Edit Profile">
                            <img src={avatar} alt="Profile" />
                        </div>
                        <div className="header-actions">
                            <button onClick={() => setShowAddModal(true)} title="Add Contact"><FiPlus /></button>
                            <button onClick={handleLogout} title="Logout"><FiLogOut style={{ color: "#ef5350" }} /></button>
                        </div>
                    </div>

                    <div className="search-bar">
                        <div className="search-input"><FiSearch /><input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
                    </div>

                    <div className="contact-list">
                        <div className={`contact-item ${currentChat === "CHATROOM" ? 'active' : ''}`} onClick={() => { setCurrentChat("CHATROOM"); setIsMobileChatOpen(true); }}>
                            <div className="avatar-placeholder group-icon">#</div>
                            <div className="contact-info"><h4>Public Lounge</h4>
                                <p style={typingUsers["CHATROOM"] ? {color: '#4cc9f0', fontStyle: 'italic'} : {}}>{typingUsers["CHATROOM"] || "Tap to join discussion"}</p>
                            </div>
                        </div>
                        {filteredContacts.map(contact => (
                            <div key={contact} className={`contact-item ${currentChat === contact ? 'active' : ''}`} onClick={() => { setCurrentChat(contact); setIsMobileChatOpen(true); }}>
                                <div className="avatar-placeholder" style={contact === "GupShup AI" ? {background: 'linear-gradient(135deg, #4facfe 0%, #f72585 100%)'} : {}}>{contact === "GupShup AI" ? "🤖" : getDisplayName(contact).charAt(0).toUpperCase()}</div>
                                <div className="contact-info">
                                    <h4>{getDisplayName(contact)}{onlineUsers.has(contact) && <span className="status-dot online"></span>}</h4>
                                    <p style={typingUsers[contact] ? {color: '#4cc9f0', fontStyle: 'italic'} : (onlineUsers.has(contact) ? {color:'#00e676', fontWeight:'bold'} : {})}>
                                        {typingUsers[contact] || (onlineUsers.has(contact) ? "Online" : "Tap to chat")}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* CHAT AREA */}
                <div className={`chat-area ${isMobileChatOpen ? 'visible-mobile active' : ''}`}>
                    <div className="chat-header">
                        <button className="back-btn" onClick={() => setIsMobileChatOpen(false)}><FiArrowLeft /></button>
                        <div className="header-info">
                            <h3>{getDisplayName(currentChat)}</h3>
                            <span>
                                {typingUsers[currentChat] ? (
                                    <span style={{color: '#4cc9f0', fontStyle: 'italic', fontWeight: '500'}}>{typingUsers[currentChat]}</span>
                                ) : (
                                    currentChat === "CHATROOM" ? "Online" : (onlineUsers.has(currentChat) ? "🟢 Online" : "Private Chat")
                                )}
                            </span>
                        </div>
                        <div className="header-menu" style={{position: 'relative'}}>
                            <button onClick={() => setShowMenu(!showMenu)}><FiMoreVertical /></button>
                            {showMenu && (
                                <div className="dropdown">
                                    <div onClick={handleClearChat}><FiTrash2 style={{marginRight: '8px'}}/> Clear Chat</div>
                                    <div onClick={() => setShowMenu(false)} style={{borderTop: '1px solid #333'}}>Close</div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="messages-container" onClick={() => {setShowEmoji(false); setShowMenu(false); setSelectedMsgId(null); setShowAttachMenu(false);}}>
                        {(currentChat === "CHATROOM" ? publicChats : (privateChats.get(currentChat) || [])).map((msg, idx) => {
                            const isImageMsg = msg.content && msg.content.startsWith("IMAGE::");
                            const isFileMsg = msg.content && msg.content.startsWith("FILE::");
                            const isAudioMsg = msg.content && msg.content.startsWith("AUDIO::");
                            const isLocMsg = msg.content && msg.content.startsWith("LOCATION::"); 
                            const isSelected = selectedMsgId === msg.timestamp;

                            return (
                            <div key={idx} className={`message-bubble ${msg.sender === phoneRef.current ? 'sent' : 'received'}`}>
                                {msg.type !== 'CHAT' && msg.type !== 'TYPING' ? (
                                    <div className="system-msg">{getDisplayName(msg.sender)} {msg.type === 'JOIN' ? 'joined' : 'left'}</div>
                                ) : (
                                    <div 
                                        className={`bubble-content ${isImageMsg || isLocMsg ? 'image-bubble' : ''} ${isFileMsg ? 'file-bubble' : ''} ${isAudioMsg ? 'audio-bubble' : ''} ${isSelected ? 'selected' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); setSelectedMsgId(isSelected ? null : msg.timestamp); }}
                                        style={{position: 'relative'}}
                                    >
                                        {msg.sender !== phoneRef.current && !isImageMsg && !isLocMsg && <span className="sender-label">{getDisplayName(msg.sender)}</span>}
                                        
                                        {renderMessageContent(msg.content)}
                                        
                                        <div className={`msg-meta ${isImageMsg || isLocMsg ? 'image-meta' : ''}`}>
                                            <span className="timestamp">{new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            {msg.sender === phoneRef.current && currentChat !== "CHATROOM" && (
                                                <span className={`msg-status ${msg.status?.toLowerCase() || 'sent'}`}>
                                                    {msg.status === 'SEEN' ? <span style={{color: (isImageMsg || isLocMsg) ? '#fff' : '#4cc9f0', letterSpacing: '-2px', fontWeight: 'bold'}}>✓✓</span> 
                                                    : msg.status === 'DELIVERED' ? <span style={{letterSpacing: '-2px'}}>✓✓</span> 
                                                    : '✓'}
                                                </span>
                                            )}
                                        </div>

                                        {isSelected && msg.sender === phoneRef.current && (
                                            <div className="msg-options-menu">
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg); }}><FiTrash2 /> Delete</button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )})}
                        <div ref={messagesEndRef}/>
                    </div>

                    <div className="input-area">
                        {isRecording ? (
                            <div className="recording-ui">
                                <span className="recording-indicator">
                                    <div className="red-dot"></div> Recording... {formatTime(recordingTime)}
                                </span>
                                <div className="recording-actions">
                                    <button className="cancel-record-btn" onClick={cancelRecording} title="Cancel"><FiTrash /></button>
                                    <button className="send-record-btn" onClick={stopRecording} title="Send"><FiSend /></button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="attach-container" style={{position: 'relative'}}>
                                    <button onClick={() => setShowAttachMenu(!showAttachMenu)} title="Attach">
                                        <FiPaperclip />
                                    </button>
                                    
                                    {showAttachMenu && (
                                        <div className="attach-menu">
                                            <button onClick={() => { attachmentRef.current.click(); setShowAttachMenu(false); }}><FiCamera /> Photo</button>
                                            <button onClick={() => { attachmentRef.current.click(); setShowAttachMenu(false); }}><FiFileText /> Document</button>
                                            <button onClick={sendLocation}><FiMapPin /> Location</button>
                                        </div>
                                    )}
                                </div>
                                <input type="file" ref={attachmentRef} hidden onChange={handleAttachmentUpload} />

                                <button onClick={() => setShowEmoji(!showEmoji)}><FiSmile /></button>
                                {showEmoji && <div className="emoji-popover"><EmojiPicker onEmojiClick={e => setUser(p => ({...p, msg: p.msg + e.emoji}))} width="100%" height={300} searchDisabled /></div>}
                                
                                <input placeholder="Type a message..." value={user.msg} onChange={handleTyping} onKeyDown={e => e.key === 'Enter' && sendMessage()} />
                                
                                {user.msg.trim() ? (
                                    <button className="send-btn" onClick={sendMessage} title="Send Message"><FiSend /></button>
                                ) : (
                                    <button className="mic-btn" onClick={startRecording} title="Record Voice"><FiMic /></button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* MODALS */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>New Chat</h3>
                            <button onClick={() => setShowAddModal(false)} className="close-btn"><FiX /></button>
                        </div>
                        <form onSubmit={handleAddContact}>
                            <div className="input-box" style={{marginBottom: '15px'}}>
                                <input type="text" placeholder="Contact Name (Optional)" className="modal-input" value={newContactName} onChange={(e) => setNewContactName(e.target.value)} />
                            </div>
                            <div className="input-box" style={{marginBottom: '15px'}}>
                                <input type="tel" placeholder="Mobile Number *" className="modal-input" autoFocus required value={newContactPhone} onChange={(e) => setNewContactPhone(e.target.value)} />
                            </div>
                            <button className="glow-btn" style={{width: '100%', marginBottom: '15px'}}>Start Chatting</button>
                            
                            <div className="modal-divider"><span>OR</span></div>
                            
                            <button type="button" className="glow-btn sync-btn" onClick={handleImportContacts}>
                                <FiUsers style={{fontSize: '18px'}} /> Select from Phonebook
                            </button>
                        </form>
                    </div>
                </div>
            )}
            
            {showProfileModal && (
                <div className="modal-overlay">
                    <div className="modal profile-modal">
                        <div className="modal-header"><h3>Profile</h3><button onClick={() => setShowProfileModal(false)} className="close-btn"><FiX /></button></div>
                        <form onSubmit={handleSaveProfile}>
                            <div className="profile-edit-section"><div className="profile-pic-large" onClick={() => fileInputRef.current.click()}><img src={avatar} alt="Avatar" /><div className="overlay"><FiCamera /></div></div><input type="file" ref={fileInputRef} style={{display: 'none'}} accept="image/*" onChange={handleImageUpload} /></div>
                            <div className="input-group-profile"><label><FiUser /> Name</label><div className="edit-input-wrapper"><input type="text" value={user.name} onChange={(e) => setUser({...user, name: e.target.value})} className="profile-input"/><FiEdit2 className="edit-icon" /></div></div>
                            <div className="input-group-profile"><label><FiInfo /> About</label><div className="edit-input-wrapper"><input type="text" value={about} onChange={(e) => setAbout(e.target.value)} className="profile-input"/><FiEdit2 className="edit-icon" /></div></div>
                            <div className="input-group-profile"><label><FiPhone /> Phone</label><input type="text" value={user.phone} disabled className="profile-input disabled" /></div>
                            <button className="glow-btn save-btn">Save Changes</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatRoom;