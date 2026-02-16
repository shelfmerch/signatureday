# Technical Skills & Technology Stack
Based on the implementation of the **Signature Day** application, here is a comprehensive list of the technical skills and technologies you have utilized.

## 🚀 Core Stack
- **Role:** Full Stack Developer (MERN)
- **Languages:** TypeScript, JavaScript (ES6+), HTML5, CSS3
- **Frontend Framework:** React.js (v18)
- **Backend Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose ODM)

## 🎨 Frontend Technologies
### Core & Architecture
- **Vite:** High-performance build tool and development server.
- **Context API:** Global state management (AuthContext, CollageContext).
- **React Query (TanStack Query):** Efficient server-state caching and synchronization.
- **React Router DOM:** Client-side routing with protected routes and layouts.

### UI & Styling
- **Tailwind CSS:** Utility-first CSS framework for rapid UI development.
- **Shadcn UI:** Reusable component library based on **Radix UI** primitives for accessibility.
- **Framer Motion:** Complex animations, drag gestures, and layout transitions.
- **Lucide React:** Modern, consistent icon set.

### Specialized Libraries
- **Fabric.js:** implementation of the interactive T-shirt designer Canvas (layer management, transformations, image compositing).
- **Face-api.js:** Browser-side face detection and recognition (AI integration).
- **Html2Canvas / JSZip:** Client-side generation of images and bulk downloads.
- **Zod:** TypeScript-first schema declaration and validation.
- **React Hook Form:** Performant form validation and state management.

## ⚙️ Backend Technologies
### API & Security
- **RESTful API Design:** Structured routes, controllers, and services layer.
- **Passport.js:** Authentication strategies (Google OAuth 2.0).
- **JWT (JSON Web Tokens):** Secure, stateless session handling.
- **Bcrypt.js:** Password hashing and security.
- **Express Rate Limit:** DDoS protection and API traffic control.
- **Cors:** Cross-Origin Resource Sharing configuration.

### Integrations & Services
- **Razorpay:** Payment gateway integration for handling transactions and webhooks.
- **Delhivery API:** Third-party logistics integration for real-time shipping rates and PIN code serviceability.
- **Nodemailer:** SMTP email service for transactional emails (OTP, welcome, order confirmation).
- **Cloudinary:** Cloud-based image management and optimization (implied by file structure/package).
- **Fast2SMS (or similar):** SMS integration for OTP/notifications (implied by `smsService.js`).

## 🛠️ Tools & DevOps
- **Git / GitHub:** Version control and collaboration.
- **Postman / Thunder Client:** API endpoint testing and debugging.
- **ESLint:** Code quality and style enforcement.
- **Nodemon:** Development workflow automation.
- **Dotenv:** Environment variable management.

## 🧠 Key Concepts Implemented
- **Role-Based Access Control (RBAC):** Middleware for Admin, Leader, and User permissions.
- **Optimistic UI:** Immediate interface updates for better UX.
- **Aggregations:** Complex MongoDB queries for dashboard analytics.
- **Service-Oriented Architecture:** separating business logic from controllers (`services/` directory).
- **Responsive Design:** Mobile-first approach for all pages.
