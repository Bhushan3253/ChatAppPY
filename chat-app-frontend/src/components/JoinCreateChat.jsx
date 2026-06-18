import React, { useState } from "react";
import chatIcon from "../assets/chat.png";
import toast from "react-hot-toast";
import { createRoomApi, joinChatApi } from "../services/RoomService";
import { useAuthStore } from "../store/useAuthStore";
import { httpClient } from "../config/AxiosHelper";
import { useNavigate } from "react-router";

const JoinCreateChat = () => {
  const [detail, setDetail] = useState({
    roomId: "",
    username: "",
    email: "",
    password: "",
  });
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const { setAuth, logout, isAuthenticated, user, setRoomId } = useAuthStore();
  const navigate = useNavigate();

  function handleFormInputChange(event) {
    setDetail({
      ...detail,
      [event.target.name]: event.target.value,
    });
  }

  async function handleAuth() {
    setIsLoading(true);
    try {
      if (isLogin) {
        const response = await httpClient.post("/api/auth/token/", {
          username: detail.username,
          password: detail.password,
        });
        setAuth(response.data.access, response.data.refresh);
        useAuthStore.getState().setUser(detail.username);
        toast.success("Logged in successfully!");
      } else {
        await httpClient.post("/api/auth/register/", {
          username: detail.username,
          email: detail.email,
          password: detail.password,
        });
        toast.success("Registered successfully! A welcome email was sent. Please login.");
        setIsLogin(true);
      }
    } catch (error) {
      if (error.response?.data) {
        // Display specific field errors if they exist
        const errors = error.response.data;
        if (errors.email) {
          const emailError = Array.isArray(errors.email) ? errors.email[0] : errors.email;
          toast.error(`Email: ${emailError}`);
        } else if (errors.username) {
          const usernameError = Array.isArray(errors.username) ? errors.username[0] : errors.username;
          toast.error(`Username: ${usernameError}`);
        } else if (errors.password) {
          const passwordError = Array.isArray(errors.password) ? errors.password[0] : errors.password;
          toast.error(`Password: ${passwordError}`);
        } else if (errors.detail) {
          toast.error(errors.detail);
        } else {
          // Show first available error
          const firstError = Object.values(errors).flat()[0];
          toast.error(firstError || "Registration failed");
        }
      } else {
        toast.error("Network error");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function joinChat() {
    if (!isAuthenticated) return toast.error("Please login first");
    if (detail.roomId === "") return toast.error("Enter Room ID");

    setIsLoading(true);
    try {
      const room = await joinChatApi(detail.roomId);
      const idToSet = room.room_id || room.id || detail.roomId;
      setRoomId(idToSet);
      toast.success("Joined Room!");
      navigate(`/chat`);
    } catch (error) {
      toast.error("Room not found or error joining");
    } finally {
      setIsLoading(false);
    }
  }

  async function createRoom() {
    if (!isAuthenticated) return toast.error("Please login first");
    if (detail.roomId === "") return toast.error("Enter New Room ID");

    setIsLoading(true);
    try {
      const response = await createRoomApi(detail.roomId);
      const idToSet = response.room_id || response.id || detail.roomId;
      setRoomId(idToSet);
      toast.success("Room Created!");
      navigate(`/chat`);
    } catch (error) {
      toast.error("Room already exists or invalid name");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <div className="p-8 border dark:border-gray-800 w-full max-w-md rounded-xl bg-white dark:bg-gray-900 shadow-2xl">
        <img src={chatIcon} className="w-20 mx-auto mb-6" alt="Logo" />
        
        {!isAuthenticated ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-center dark:text-white">
              {isLogin ? "Login to Chat" : "Create Account"}
            </h2>
            <input
              name="username"
              onChange={handleFormInputChange}
              value={detail.username}
              type="text"
              placeholder="Username"
              className="w-full px-4 py-3 rounded-lg dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            
            {!isLogin && (
              <input
                name="email"
                onChange={handleFormInputChange}
                value={detail.email}
                type="email"
                placeholder="Email Address"
                className="w-full px-4 py-3 rounded-lg dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}

            <input
              name="password"
              onChange={handleFormInputChange}
              value={detail.password}
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              disabled={isLoading}
              onClick={handleAuth}
              className={`w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
              {isLogin ? "Login" : "Register"}
            </button>
            <p className="text-center text-sm dark:text-gray-400">
              {isLogin ? "New here?" : "Already have an account?"}{" "}
              <span
                onClick={() => setIsLogin(!isLogin)}
                className="text-indigo-500 cursor-pointer font-bold"
              >
                {isLogin ? "Register" : "Login"}
              </span>
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <h2 className="text-xl font-bold dark:text-white truncate">Welcome, {user?.username}!</h2>
            <p className="text-sm text-gray-500">Enter a Room ID to start chatting</p>
            <input
              name="roomId"
              onChange={handleFormInputChange}
              value={detail.roomId}
              type="text"
              placeholder="Room ID (e.g. General)"
              className="w-full px-4 py-3 rounded-lg dark:bg-gray-800 dark:text-white border dark:border-gray-700 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                disabled={isLoading}
                onClick={joinChat}
                className={`flex-1 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Join
              </button>
              <button
                disabled={isLoading}
                onClick={createRoom}
                className={`flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 transition flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                Create
              </button>
            </div>
            <button
              onClick={logout}
              className="text-red-500 text-sm font-bold hover:underline mt-4"
            >
              Switch Account / Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default JoinCreateChat;
