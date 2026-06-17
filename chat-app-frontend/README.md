# Chat App Frontend

This is the Vite React frontend for the chat app.

## Deploy on Vercel

1. Import the `chat-app-frontend` folder into Vercel.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Add these environment variables:
	- `VITE_API_URL=https://your-backend.onrender.com`
	- `VITE_WS_URL=wss://your-backend.onrender.com`
5. Keep [vercel.json](vercel.json) in place so client-side routes load correctly.

## Local development

1. Run `npm install`.
2. Run `npm run dev`.
3. If the backend is local, leave the default localhost URLs in place.
