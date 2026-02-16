# Signature Day Backend

This is the backend for the Signature Day application, built with Express.js and MongoDB.

## Features

- User authentication with JWT
- Group creation and management
- Member joining with photo uploads
- Grid template voting system

## Prerequisites

- Node.js (v14+)
- MongoDB (local or Atlas)

## Installation

1. Clone the repository
2. Navigate to the backend directory:
   ```
   cd backend
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Create a `.env` file in the root of the backend directory with the following content:
   ```
   PORT=4000
   NODE_ENV=development
   
   # Mongo
   MONGODB_URI=mongodb://localhost:27017/signatureday
   
   # Auth
   JWT_SECRET=your_jwt_secret_key_change_in_production
   
   # Optional admin seed
   ADMIN_EMAIL=admin@example.com
   ADMIN_PASSWORD=supersecret
   ADMIN_NAME=Administrator
   
   # Razorpay
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxx
   ```

## Running the Server

### Development Mode

```
npm run dev
```

### Production Mode

```
npm start
```

## API Endpoints

### Authentication

- `POST /api/users/register` - Register a new user
- `POST /api/users/login` - Login and get token
- `GET /api/users/profile` - Get user profile (protected)
- `PUT /api/users/profile` - Update user profile (protected)

### Groups

- `POST /api/groups` - Create a new group (protected)
- `GET /api/groups` - Get all groups (protected, leader only)
- `GET /api/groups/:id` - Get group by ID (public)
- `POST /api/groups/:id/join` - Join a group
- `PUT /api/groups/:id/template` - Update group template (protected, leader only)
- `PUT /api/groups/:id` - Update group (protected, leader only)
- `DELETE /api/groups/:id` - Delete group (protected, leader only)

## Error Handling

The API uses standard HTTP status codes and returns JSON responses with appropriate error messages.

## Data Models

### User Model

- `name` - User's name
- `email` - User's email (unique)
- `password` - Hashed password
- `isLeader` - Boolean indicating if user is a group leader
- `groupId` - ID of the group user belongs to (optional)
- `createdAt` - Timestamp when user was created

### Group Model

- `name` - Group name
- `yearOfPassing` - Year of passing
- `totalMembers` - Total number of members allowed
- `gridTemplate` - Grid template type (hexagonal, square, circle)
- `shareLink` - Link for sharing the group
- `members` - Array of members in the group
- `votes` - Record of votes for each grid template
- `createdAt` - Timestamp when group was created

### Member Schema (embedded in Group)

- `name` - Member's name
- `memberRollNumber` - Member's roll number
- `photo` - Base64 encoded photo
- `vote` - Member's vote for grid template
- `size` - Size preference (s, m, l, xl, xxl)
- `joinedAt` - Timestamp when member joined

