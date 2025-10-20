# VMS Frontend

React + TypeScript frontend for Video Management System.

## Tech Stack

- **Vite** - Build tool
- **React 18** - UI library
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **React Router** - Navigation
- **Video.js** - Video player
- **Axios** - HTTP client

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/        # React contexts (AuthContext)
├── pages/           # Page components
│   ├── LoginPage.tsx       # User authentication
│   ├── DashboardPage.tsx   # Camera grid view
│   └── CameraLiveView.tsx  # Live video player
├── services/        # API client
├── types/           # TypeScript interfaces
└── utils/           # Helper functions
```

## Getting Started

### Prerequisites

- Node.js 18+
- Backend API running on port 3000

### Installation

```bash
npm install
```

### Environment Variables

Create `.env` file:

```env
VITE_API_URL=http://localhost:3000
VITE_MEDIAMTX_HOST=localhost
VITE_MEDIAMTX_HLS_PORT=8888
```

### Development

```bash
# Start dev server
npm run dev

# Open browser at http://localhost:5173
```

Default credentials:
- Username: `admin`
- Password: `admin123`

### Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

### Authentication
- JWT-based login
- Auto token refresh
- Protected routes
- Session management

### Dashboard
- Camera grid (3 columns, responsive)
- Real-time status indicators
- Camera count badge
- Click to view live feed

### Live View
- HLS video streaming
- Video.js player with controls
- Camera information panel
- Stream statistics
- Navigation to recordings

## API Integration

All backend communication goes through `apiClient`:

```typescript
import { apiClient } from './services/api';

// Authentication
await apiClient.login(username, password);

// Cameras
const cameras = await apiClient.getCameras();

// Streams
const streamInfo = await apiClient.getStreamInfo(cameraId);
```

## Routing

- `/login` - Login page
- `/` - Dashboard (protected)
- `/camera/:cameraId` - Live view (protected)

## Troubleshooting

### Backend connection issues
Check `VITE_API_URL` in `.env` matches backend port.

### Video not playing
- Verify MediaMTX is running
- Check HLS stream URL: `http://localhost:8888/camera1/index.m3u8`
- Ensure camera is online

### Authentication fails
- Backend API must be running
- Check username/password
- Verify JWT secret in backend
