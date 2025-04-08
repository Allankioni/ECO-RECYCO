# E-Waste Management Platform

A modern web application for managing electronic waste through recycling and reselling. This platform allows users to sell their e-waste and participate in bidding for refurbished electronic products.

## Features

- User Authentication & Profiles
- E-waste Listing & Selling
- Bidding System
- Product Categories & Search
- Payment Integration
- Admin Dashboard
- Recycling Information & Guidelines
- Rating & Review System

## Tech Stack

- Frontend: React.js with TypeScript
- Backend: Node.js with Express
- Database: MongoDB
- Authentication: JWT
- UI Framework: Tailwind CSS

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. Create a `.env` file in the backend directory with the following variables:
   ```
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   PORT=5000
   ```

4. Start the development servers:
   ```bash
   # Start backend server
   cd backend
   npm run dev

   # Start frontend server
   cd frontend
   npm start
   ```

## Project Structure

```
e-waste-management/
├── backend/           # Backend server code
├── frontend/         # Frontend React application
└── README.md         # Project documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License. 