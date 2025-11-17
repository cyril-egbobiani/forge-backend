# Forge Church App Backend API Documentation

## Authentication System

The Forge Church App backend now includes a complete JWT-based authentication system with role-based access control.

### Base URL

```
http://localhost:3000/api
```

## Authentication Routes

### 1. Register User

**POST** `/auth/register`

Create a new user account.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890" // optional
}
```

**Response:**

```json
{
  "success": true,
  "message": "User registered successfully",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "phoneNumber": "+1234567890",
    "isActive": true,
    "joinedDate": "2024-11-15T10:00:00.000Z",
    "createdAt": "2024-11-15T10:00:00.000Z",
    "updatedAt": "2024-11-15T10:00:00.000Z"
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### 2. Login User

**POST** `/auth/login`

Authenticate user and get access tokens.

**Request Body:**

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "phoneNumber": "+1234567890",
    "isActive": true,
    "lastSeen": "2024-11-15T10:30:00.000Z"
  },
  "token": "jwt_access_token",
  "refreshToken": "jwt_refresh_token"
}
```

### 3. Refresh Token

**POST** `/auth/refresh`

Get new access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response:**

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "token": "new_jwt_access_token",
  "refreshToken": "new_jwt_refresh_token"
}
```

### 4. Get Current User Profile

**GET** `/auth/me`

Get authenticated user's profile information.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "success": true,
  "user": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "member",
    "phoneNumber": "+1234567890",
    "isActive": true,
    "prayerRequests": [...],
    "favoriteTeachings": [...]
  }
}
```

### 5. Update Profile

**PUT** `/auth/me`

Update user profile information.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "name": "John Smith",
  "phoneNumber": "+1987654321"
}
```

### 6. Change Password

**PUT** `/auth/change-password`

Change user password.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "currentPassword": "oldpassword123",
  "newPassword": "newpassword456"
}
```

### 7. Verify Token

**GET** `/auth/verify`

Verify if token is valid.

**Headers:**

```
Authorization: Bearer <access_token>
```

### 8. Logout

**POST** `/auth/logout`

Logout user (invalidate token).

**Headers:**

```
Authorization: Bearer <access_token>
```

## User Management Routes (Admin/Pastor Only)

### 1. Get All Users

**GET** `/users`

Get list of all users with pagination and filtering.

**Headers:**

```
Authorization: Bearer <admin_or_pastor_token>
```

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)
- `role` - Filter by role (member, leader, pastor, admin)
- `search` - Search by name or email
- `active` - Filter by active status (true/false)

### 2. Get User by ID

**GET** `/users/:id`

Get specific user information.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Note:** Users can only view their own profile unless they're admin/pastor.

### 3. Update User Role (Admin Only)

**PUT** `/users/:id/role`

Update user's role.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "role": "leader"
}
```

### 4. Activate/Deactivate User (Admin Only)

**PUT** `/users/:id/status`

Activate or deactivate user account.

**Headers:**

```
Authorization: Bearer <admin_token>
```

**Request Body:**

```json
{
  "isActive": false
}
```

### 5. Delete User (Admin Only)

**DELETE** `/users/:id`

Delete user account.

**Headers:**

```
Authorization: Bearer <admin_token>
```

### 6. User Statistics (Admin/Pastor Only)

**GET** `/users/stats/overview`

Get user statistics overview.

**Headers:**

```
Authorization: Bearer <admin_or_pastor_token>
```

## Protected Routes

### Prayer Requests

- **GET** `/prayers` - Public (optional auth)
- **GET** `/prayers/:id` - Public (optional auth)
- **POST** `/prayers` - Requires authentication
- **POST** `/prayers/:id/pray` - Requires authentication
- **PUT** `/prayers/:id` - Requires authentication (owner, pastor, or admin)
- **GET** `/prayers/category/:category` - Public (optional auth)

### Teachings

- **GET** `/teachings` - Public (optional auth)
- **GET** `/teachings/:id` - Public
- **POST** `/teachings` - Requires pastor or admin role
- **POST** `/teachings/upload` - Requires pastor or admin role

## User Roles and Permissions

### Member (Default)

- Create and view prayer requests
- View teachings
- Update own profile
- Pray for others' requests

### Leader

- All member permissions
- May have additional features in future updates

### Pastor

- All member and leader permissions
- Create and upload teachings
- View user statistics
- Manage prayer requests

### Admin

- All permissions
- User management (create, update, delete, role changes)
- Full access to all resources

## Authentication Headers

For protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "message": "Error description"
}
```

## Common HTTP Status Codes

- **200** - OK
- **201** - Created
- **400** - Bad Request (validation errors)
- **401** - Unauthorized (invalid/missing token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **409** - Conflict (duplicate email)
- **500** - Internal Server Error

## Environment Variables

The following environment variables are required:

```env
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRES_IN=30d
MONGODB_URI=your-mongodb-connection-string
PORT=3000
NODE_ENV=development
```

## Socket.IO Events (Real-time)

The authentication system integrates with existing Socket.IO events:

- `new-prayer-request` - Emitted when prayer request is created
- `prayer-request-update` - Emitted when prayer request is updated

## Testing the API

You can test the API using tools like Postman or curl:

### Register a new user:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'
```

### Login:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

### Access protected route:

```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Frontend Integration

The Flutter app's AuthService is already configured to work with these endpoints:

- Login: `POST /api/auth/login`
- Register: `POST /api/auth/register`
- Refresh: `POST /api/auth/refresh`
- Verify: `GET /api/auth/verify`

The tokens are automatically stored in SharedPreferences and included in subsequent API calls.
