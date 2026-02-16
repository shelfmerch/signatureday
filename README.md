# Signature Day App

A full-stack MERN application for creating and managing signature day collages.

## Features

- User authentication (register, login, profile management)
- Group creation and management
- Member joining with photo uploads
- Different grid templates (square, hexagonal, circle)
- Template voting system
- Admin dashboard for group management

## Tech Stack

### Frontend
- React with TypeScript
- Vite for build tooling
- React Router for navigation
- Tailwind CSS with shadcn/ui components
- Context API for state management

### Backend
- Express.js
- MongoDB with Mongoose
- JWT authentication
- RESTful API design

## Project Structure

```
signatureday/
├── backend/             # Express backend
│   ├── config/          # Database configuration
│   ├── controllers/     # API controllers
│   ├── middleware/      # Auth middleware
│   ├── models/          # Mongoose models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Entry point
├── public/              # Static assets
├── src/                 # React frontend
│   ├── components/      # UI components
│   ├── context/         # Context providers
│   ├── hooks/           # Custom hooks
│   ├── lib/             # Utility functions
│   ├── pages/           # Page components
│   ├── services/        # API services
│   └── types/           # TypeScript types
└── README.md            # This file
```

## Getting Started

### Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
2. Install frontend dependencies:
   ```
   npm install
   ```
3. Install backend dependencies:
   ```
   cd backend
   npm install
   ```

### Configuration

1. Create a `.env` file in the backend directory with:
   ```
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/signatureday
   JWT_SECRET=your_jwt_secret_key_change_in_production
   NODE_ENV=development
   ```

### Running the Application

#### Development Mode

1. Start the backend server:
   ```
   cd backend
   npm run dev
   ```
2. In a separate terminal, start the frontend:
   ```
   npm run dev
   ```

#### Production Build

1. Build the frontend:
   ```
   npm run build
   ```
2. Start the backend server:
   ```
   cd backend
   npm start
   ```

## Fallback to localStorage

The application is designed to work even when the backend is not available. It will fallback to using localStorage for data persistence in such cases, ensuring a seamless user experience.

## API Integration

The frontend communicates with the backend through a dedicated API service that handles all HTTP requests. In case of API failures, the application gracefully falls back to localStorage.

## Original Project

This project was created with [Lovable](https://lovable.dev/projects/dca2cd2b-84d7-477e-bf67-54261f08ec58).