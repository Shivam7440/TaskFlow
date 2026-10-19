# TaskFlow - Full-Stack Task Management & Collaboration Application

A modern, production-ready task management and collaboration platform similar to Trello, Notion, and Asana. Built with the MERN stack (MongoDB, Express.js, React.js, Node.js) with real-time collaboration features powered by Socket.io.

## 🚀 Features

### Core Functionality
- **Complete Authentication System**
  - JWT-based authentication with access and refresh tokens
  - OAuth integration (Google & GitHub)
  - Email verification and password reset
  - Session management
  - Role-based access control (Admin, Manager, Member, Guest)

- **Workspace & Project Management**
  - Create and manage multiple workspaces
  - Organize projects within workspaces
  - Team collaboration with role-based permissions
  - Project templates for quick setup

- **Advanced Task Management**
  - Drag-and-drop Kanban boards
  - Multiple views: Kanban, List, Calendar, Timeline
  - Task properties: title, description, priority, status, due dates
  - Assignees, labels, and custom fields
  - Checklists and subtasks
  - Task dependencies
  - Time tracking

- **Real-time Collaboration**
  - Live updates across all connected users
  - Presence indicators (who's viewing/editing)
  - Real-time comments and mentions
  - Instant notifications

- **File Management**
  - Local file upload system
  - Multiple file type support
  - File attachments on tasks
  - Organized storage by date

- **Notifications**
  - In-app notifications
  - Mock email service (ready for production email integration)
  - Customizable notification preferences

- **Analytics & Reporting**
  - Activity logs and audit trails
  - Task completion metrics
  - Team productivity insights

- **UI/UX Excellence**
  - Modern, clean corporate design
  - Dark mode and light mode support
  - Fully responsive (mobile, tablet, desktop)
  - Smooth animations and transitions
  - Toast notifications
  - Loading states and skeletons

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT, Passport.js (Google OAuth, GitHub OAuth)
- **Real-time**: Socket.io
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting, bcryptjs
- **Validation**: express-validator

### Frontend
- **Framework**: React 18
- **Styling**: Tailwind CSS
- **State Management**: Context API
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Real-time**: Socket.io-client
- **UI Components**: Headless UI, Heroicons
- **Drag & Drop**: @dnd-kit
- **Notifications**: react-hot-toast
- **Date Handling**: date-fns
- **Charts**: Chart.js, react-chartjs-2

## 📦 Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (v5 or higher)
- npm or yarn

### 1. Clone the Repository
```bash
git clone <repository-url>
cd TaskFlowTaskManagementApp
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env file with your configuration
nano .env
```

**Configure environment variables in `.env`:**
```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/taskflow

# JWT Secrets (Generate secure random strings)
JWT_SECRET=your_super_secret_jwt_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# OAuth - Google (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# OAuth - GitHub (Optional)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# Session Secret
SESSION_SECRET=your_session_secret_here

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

**Start MongoDB:**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas (cloud) by updating MONGODB_URI in .env
```

**Run the backend server:**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

The backend API will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
echo "REACT_APP_SOCKET_URL=http://localhost:5000" >> .env

# Start the development server
npm start
```

The frontend will be available at `http://localhost:3000`

## 🔧 Configuration

### OAuth Setup (Optional)

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

#### GitHub OAuth
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create new OAuth App
3. Set Authorization callback URL: `http://localhost:5000/api/auth/github/callback`
4. Copy Client ID and Client Secret to `.env`

### Email Service (Production)

For production, replace the mock email service with a real provider:

**Option 1: SendGrid**
```bash
npm install @sendgrid/mail
```

**Option 2: Resend**
```bash
npm install resend
```

Update `backend/utils/emailService.js` with your chosen provider.

### Cloudinary Setup (Production File Storage)

1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get your credentials from dashboard
3. Add to `.env`:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```
4. Update file upload middleware to use Cloudinary SDK

## 📁 Project Structure

```
taskflow/
├── backend/
│   ├── config/
│   │   ├── database.js         # MongoDB ***
│   │   └── passport.js         # Passport strategies
│   ├── controllers/
│   │   ├── authController.js   # Authentication logic
│   │   └── taskController.js   # Task CRUD operations
│   ├── models/
│   │   ├── User.js             # User schema
│   │   ├── Workspace.js        # Workspace schema
│   │   ├── Project.js          # Project schema
│   │   ├── Task.js             # Task schema
│   │   ├── Comment.js          # Comment schema
│   │   ├── Notification.js     # Notification schema
│   │   ├── ActivityLog.js      # Activity log schema
│   │   └── Template.js         # Template schema
│   ├── routes/
│   │   ├── authRoutes.js       # Auth endpoints
│   │   └── taskRoutes.js       # Task endpoints
│   ├── middleware/
│   │   ├── auth.js             # JWT verification
│   │   ├── errorHandler.js     # Global error handling
│   │   ├── validation.js       # Input validation
│   │   └── upload.js           # File upload handling
│   ├── socket/
│   │   └── index.js            # Socket.io configuration
│   ├── utils/
│   │   ├── tokenUtils.js       # JWT helpers
│   │   └── emailService.js     # Email sending
│   ├── uploads/                # File storage directory
│   ├── .env.example            # Environment template
│   ├── package.json
│   └── server.js               # Main server file
1   ├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/
│   │   │   ├── LandingPage.js  # Home page
│   │   │   ├── Login.js        # Login page
│   │   │   ├── Register.js     # Registration
│   │   │   ├── Dashboard.js    # Main dashboard
│   │   │   ├── KanbanBoard.js  # Kanban view
│   │   │   └── NotFound.js     # 404 page
│   │   ├── context/
│   │   │   ├── AuthContext.js  # Authentication state
│   │   │   ├── ThemeContext.js # Theme management
│   │   │   └── SocketContext.js# Socket.io ***
│   │   ├── services/
│   │   │   └── api.js          # API client & endpoints
│   │   ├── styles/
│   │   │   └── index.css       # Global styles
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   ├── tailwind.config.js      # Tailwind configuration
│   └── package.json
└── README.md
```

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `PUT /api/auth/reset-password/:token` - Reset password
- `GET /api/auth/verify-email/:token` - Verify email
- `GET /api/auth/google` - Google OAuth
- `GET /api/auth/github` - GitHub OAuth

### Tasks
- `GET /api/tasks` - Get all tasks (with filters)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PUT /api/tasks/:id/move` - Move task (drag & drop)
- `POST /api/tasks/:id/attachments` - Upload attachment

### Health Check
- `GET /api/health` - Server health status
- `GET /api/socket/status` - Active socket ***s

## 🔐 Security Features

- **JWT Authentication** with access and refresh tokens
- **Password Hashing** using bcryptjs
- **Input Validation** with express-validator
- **Rate Limiting** to prevent brute-force attacks
- **Helmet.js** for security headers
- **CORS** configuration
- **XSS Protection** via input sanitization
- **SQL/NoSQL Injection** prevention via Mongoose
- **File Upload Validation** (type, size, extension)

## 🚦 Running in Production

### Backend Deployment

```bash
cd backend

# Set environment to production
export NODE_ENV=production

# Install only production dependencies
npm install --production

# Start server
npm start
```

**Or use PM2 for process management:**
```bash
npm install -g pm2
pm2 start server.js --name taskflow-api
pm2 save
pm2 startup
```

### Frontend Deployment

```bash
cd frontend

# Build for production
npm run build

# Serve with a static server
npx serve -s build
```

**Or deploy to:**
- Vercel
- Netlify
- AWS S3 + CloudFront
- Heroku

### Database

For production, use:
- MongoDB Atlas (managed cloud database)
- AWS DocumentDB
- Self-hosted MongoDB with replica sets

## 📝 Environment Variables

### Required
- `MONGODB_URI` - Database *** string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret

### Optional
- `GOOGLE_CLIENT_ID` - For Google OAuth
- `GITHUB_CLIENT_ID` - For GitHub OAuth
- `CLOUDINARY_*` - For cloud file storage

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📊 Database Schema

### Collections
1. **users** - User accounts and authentication
2. **workspaces** - Team workspaces
3. **projects** - Projects within workspaces
4. **tasks** - Individual tasks/cards
5. **comments** - Task comments
6. **notifications** - User notifications
7. **activitylogs** - Audit trail
8. **templates** - Project and task templates

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👥 Support

For support, email support@taskflow.com or open an issue in the repository.

## 🎉 Acknowledgments

- Built with modern best practices
- Inspired by Trello, Asana, and Notion
- Uses industry-standard security measures

---

**Happy Task Managing! 🚀**