import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';

export const useAuthStore = create(
    persist(
        (set) => ({
            user: null,
            token: null,
            refreshToken: null,
            roomId: null,
            isAuthenticated: false,

            setAuth: (token, refreshToken) => {
                try {
                    const decoded = jwtDecode(token);
                    set({
                        token,
                        refreshToken,
                        user: {
                            id: decoded.user_id,
                            username: decoded.username || 'User',
                        },
                        isAuthenticated: true,
                    });
                } catch (error) {
                    console.error("Token decoding failed:", error);
                }
            },

            setUser: (username) => {
                set((state) => ({
                    user: state.user ? { ...state.user, username } : { username }
                }));
            },

            setRoomId: (id) => {
                console.log("Setting Room ID in Store:", id);
                set({ roomId: id });
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    refreshToken: null,
                    roomId: null,
                    isAuthenticated: false,
                });
            },
        }),
        {
            name: 'auth-storage',
        }
    )
);
