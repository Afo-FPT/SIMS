# CORS Configuration - Backend Only

## ✅ Correct Implementation

CORS is now properly configured **ONLY in the backend** at:
- **Location**: `apps/backend/src/middleware.ts`
- **Applied to**: `/api/*` routes only

## Why CORS Must Be in the Backend

### Technical Explanation

1. **Browser Security**: Browsers enforce Same-Origin Policy. When a frontend at `http://localhost:3000` tries to call a backend at `http://localhost:3001`, the browser blocks it unless the backend explicitly allows it.

2. **Server Controls Access**: Only the **server** (backend) can set the CORS response headers that tell the browser which origins are allowed:
   ```
   Access-Control-Allow-Origin: http://localhost:3000
   Access-Control-Allow-Credentials: true
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   ```

3. **Frontend Cannot Set These Headers**: The frontend (client-side JavaScript) **cannot** set CORS headers. These headers must come from the server response.

4. **Preflight Requests**: For certain cross-origin requests (with credentials, custom headers), browsers send an OPTIONS request first. The backend must respond with appropriate CORS headers.

### What Happens Without Backend CORS

```
Browser: "Can I make a request from http://localhost:3000 to http://localhost:3001?"
Backend: (No CORS headers in response)
Browser: "Access denied! Blocking the request."
Frontend: ❌ CORS error
```

### What Happens With Backend CORS

```
Browser: "Can I make a request from http://localhost:3000 to http://localhost:3001?"
Backend: "Yes! Here are the CORS headers allowing it."
Browser: "Great! Proceeding with the request."
Frontend: ✅ Request succeeds
```

## Configuration Details

### Allowed Origins
- `http://localhost:3000` - Development frontend
- `https://app.sims-ai.com` - Production frontend

### Allowed Methods
- GET
- POST
- PUT
- DELETE
- OPTIONS (for preflight)

### Allowed Headers
- `Content-Type` - For JSON requests
- `Authorization` - For authentication tokens

### Features
- ✅ Credentials support (cookies, authorization)
- ✅ Preflight OPTIONS handling
- ✅ Only applies to `/api/*` routes

## Testing

### Test from Frontend

```typescript
// In apps/frontend
fetch('http://localhost:3001/api/health', {
  method: 'GET',
  credentials: 'include',
  headers: {
    'Authorization': 'Bearer token123',
    'Content-Type': 'application/json',
  },
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Test with curl

```bash
# Preflight request
curl -X OPTIONS http://localhost:3001/api/health \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization" \
  -v

# Should see:
# Access-Control-Allow-Origin: http://localhost:3000
# Access-Control-Allow-Credentials: true
# Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization
```

## Important Rules

- ❌ **NEVER** configure CORS in the frontend
- ❌ **NEVER** use Next.js middleware for CORS
- ❌ **NEVER** use proxy or rewrites for CORS
- ✅ **ALWAYS** configure CORS in the backend
- ✅ **ALWAYS** test CORS from the frontend

## File Structure

```
apps/backend/
├── src/
│   ├── middleware.ts          ← CORS configuration here
│   ├── index.ts                ← Uses corsMiddleware
│   └── middleware/
│       └── README.md          ← Detailed explanation
└── CORS_CONFIGURATION.md      ← This file
```

