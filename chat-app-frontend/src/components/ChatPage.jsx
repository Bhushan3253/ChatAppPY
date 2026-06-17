import React, { useEffect, useRef, useState } from "react";
import { MdAttachFile, MdSend, MdInsertDriveFile, MdTagFaces } from "react-icons/md";
import { useAuthStore } from "../store/useAuthStore";
import { useNavigate } from "react-router";
import toast from "react-hot-toast";
import { getMessagess } from "../services/RoomService";
import { timeAgo } from "../config/helper";
import { httpClient, baseURL, websocketBaseURL } from "../config/AxiosHelper";

const ChatPage = () => {
  const { roomId, isAuthenticated, user, token } = useAuthStore();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(null); // stores message ID
  
  const chatBoxRef = useRef(null);
  const fileInputRef = useRef(null);
  const [ws, setWs] = useState(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !roomId) navigate("/");
  }, [isAuthenticated, roomId, navigate]);

  useEffect(() => {
    async function loadMessages() {
      try {
        const pastMessages = await getMessagess(roomId);
        setMessages(pastMessages);
      } catch (error) {
        toast.error("Failed to load past messages");
      }
    }
    if (isAuthenticated && roomId) loadMessages();
  }, [isAuthenticated, roomId]);

  useEffect(() => {
    if (chatBoxRef.current) chatBoxRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isAuthenticated || !roomId) return;

    const socketUrl = `${websocketBaseURL}/ws/chat/${roomId}/?token=${token}`;
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => setWs(socket);
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'message') {
        setMessages((prev) => [...prev, data]);
      } else if (data.type === 'presence') {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          data.status === 'online' ? next.add(data.username) : next.delete(data.username);
          return next;
        });
      } else if (data.type === 'typing') {
        setTypingUsers((prev) => {
          const next = new Set(prev);
          data.is_typing ? next.add(data.username) : next.delete(data.username);
          return next;
        });
      } else if (data.type === 'reaction') {
        setMessages((prev) => prev.map(m => 
          m.id === data.message_id ? { ...m, reactions_summary: data.reactions_summary } : m
        ));
      }
    };

    return () => socket.close();
  }, [roomId, isAuthenticated, token]);

  const sendMessage = () => {
    if (ws && input.trim()) {
      ws.send(JSON.stringify({ type: 'message', content: input }));
      setInput("");
      sendTypingStatus(false);
    }
  };

  const sendTypingStatus = (isTyping) => {
    if (ws) ws.send(JSON.stringify({ type: 'typing', is_typing: isTyping }));
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (!typingTimeoutRef.current) sendTypingStatus(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
      typingTimeoutRef.current = null;
    }, 2000);
  };

  const toggleReaction = (messageId, emoji) => {
    if (ws) {
      ws.send(JSON.stringify({ type: 'reaction', message_id: messageId, emoji }));
      setShowEmojiPicker(null);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await httpClient.post(`/api/v1/rooms/${roomId}/upload_file/`, formData);
      toast.success("File uploaded!");
      // Backend should ideally broadcast this, but we'll add it for UI feedback
      setMessages(prev => [...prev, response.data]);
    } catch (error) { toast.error("Upload failed"); }
  };

  const isImage = (url) => url && /\.(jpg|jpeg|png|webp|gif|svg)$/.test(url.toLowerCase());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans">
      <header className="dark:bg-gray-900 border-b dark:border-gray-800 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
            {roomId?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-bold dark:text-white">{roomId}</h1>
            <p className="text-[10px] text-green-500">{onlineUsers.size} online</p>
          </div>
        </div>
        <button onClick={() => navigate("/")} className="text-red-500 text-sm font-bold">Leave</button>
      </header>

      <main className="flex-grow overflow-y-auto p-4 space-y-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === user?.username ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] group relative ${msg.sender === user?.username ? "items-end" : "items-start"} flex flex-col`}>
              <span className="text-[10px] text-gray-500 mb-1 px-1">{msg.sender}</span>
              <div className={`p-3 rounded-2xl shadow-sm ${msg.sender === user?.username ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white dark:bg-gray-800 dark:text-gray-200 rounded-tl-none border dark:border-gray-700"}`}>
                {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
                {msg.file_url && (
                  <div className="mt-2">
                    {isImage(msg.file_url) ? (
                      <img src={`${baseURL}${msg.file_url}`} className="rounded-lg max-h-60" alt="upload" />
                    ) : (
                      <a href={`${baseURL}${msg.file_url}`} className="flex items-center gap-2 p-2 bg-black/5 rounded text-xs"><MdInsertDriveFile /> View File</a>
                    )}
                  </div>
                )}
                
                {/* Reactions Display */}
                {msg.reactions_summary?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.reactions_summary.map((r, i) => (
                      <button key={i} onClick={() => toggleReaction(msg.id, r.emoji)} className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-full text-[10px] flex items-center gap-1">
                        {r.emoji} <span>{r.count}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Reaction Picker Trigger */}
              <button 
                onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                className="absolute -top-2 -right-2 bg-white dark:bg-gray-700 p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition"
              >
                <MdTagFaces className="text-gray-500" size={16} />
              </button>

              {showEmojiPicker === msg.id && (
                <div className="absolute -top-10 right-0 bg-white dark:bg-gray-800 shadow-xl rounded-full p-1 flex gap-1 z-30 border dark:border-gray-700">
                  {['❤️', '👍', '😂', '😮', '😢', '🔥'].map(e => (
                    <button key={e} onClick={() => toggleReaction(msg.id, e)} className="hover:scale-125 transition p-1">{e}</button>
                  ))}
                </div>
              )}

              <span className="text-[9px] text-gray-400 mt-1">{timeAgo(msg.timestamp)}</span>
            </div>
          </div>
        ))}
        <div ref={chatBoxRef}></div>
      </main>

      <footer className="p-4 bg-white dark:bg-gray-900 border-t dark:border-gray-800">
        {typingUsers.size > 0 && (
          <p className="text-[10px] text-gray-400 italic mb-2 px-2">
            {[...typingUsers].filter(u => u !== user?.username).join(", ")} {typingUsers.size === 1 ? "is" : "are"} typing...
          </p>
        )}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-2xl">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current.click()} className="p-2 text-gray-400"><MdAttachFile size={22} /></button>
          <input
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Write something..."
            className="flex-grow bg-transparent text-sm focus:outline-none dark:text-white px-2"
          />
          <button onClick={sendMessage} className="bg-indigo-600 text-white p-2.5 rounded-xl shadow-lg"><MdSend size={18} /></button>
        </div>
      </footer>
    </div>
  );
};

export default ChatPage;
