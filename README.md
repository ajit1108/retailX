# RetailX Backend

Node.js, Express, and MongoDB Atlas backend for the RetailX inventory app.

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `backend` folder:

```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=30d
WHATSAPP_PROVIDER=mock
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
ML_PREDICTION_URL=http://localhost:8000/predict
```

Run in development:

```bash
npm run dev
```

Run in production:

```bash
npm start
```

## Auth Header

Protected routes need this header:

```http
Authorization: Bearer your_jwt_token
```

## Health

```http
GET /
```

## Auth APIs

```http
POST /api/auth/register
POST /api/auth/login
```

Register body:

```json
{
  "name": "Ajit",
  "shopName": "RetailX Store",
  "mobile": "9876543210",
  "email": "test@example.com",
  "password": "123456"
}
```

Login body:

```json
{
  "email": "test@example.com",
  "password": "123456"
}
```

## Profile APIs

```http
GET /api/users/me
PUT /api/users/me
PUT /api/users/change-password
```

Update profile:

```json
{
  "name": "Ajit",
  "shopName": "RetailX Store",
  "mobile": "9876543210",
  "email": "test@example.com"
}
```

Change password:

```json
{
  "currentPassword": "123456",
  "newPassword": "new123456"
}
```

## Settings APIs

```http
GET /api/settings
PUT /api/settings
```

```json
{
  "lowStockAlerts": true,
  "weeklyInsights": true,
  "autoSaveReceipts": false
}
```

## Product APIs

```http
POST /api/products
GET /api/products
GET /api/products/barcode/:barcode
PUT /api/products/:id
DELETE /api/products/:id
```

Smart product rules:

- With barcode: match by `barcode + user`
- Without barcode: match by normalized `name + user`
- Existing products are updated instead of duplicated
- Quantity is increased when provided
- Missing fields are filled from OCR/barcode data
- Products are returned grouped by category in FIFO order

Add product:

```json
{
  "name": "Organic Whole Milk",
  "barcode": "8901234567890",
  "quantity": 2,
  "price": 58,
  "category": "Dairy",
  "expiryDate": "2026-12-12"
}
```

## Offline Sync API

```http
POST /api/sync
```

```json
{
  "products": [
    {
      "name": "Sourdough Bread",
      "barcode": "8909876543210",
      "quantity": 1,
      "price": 42,
      "category": "Bakery",
      "expiryDate": "2026-12-12"
    }
  ]
}
```

## Scan API

```http
POST /api/scan
```

Barcode:

```json
{
  "barcode": "8901234567890"
}
```

OCR text/name:

```json
{
  "text": "Organic Whole Milk"
}
```

## Billing APIs

```http
POST /api/bills
GET /api/bills
GET /api/bills/summary/today
GET /api/bills/:id
```

Create bill:

```json
{
  "taxRate": 0.05,
  "items": [
    {
      "barcode": "8901234567890",
      "quantity": 2
    }
  ]
}
```

Billing automatically:

- calculates subtotal, tax, and total
- reduces product stock
- keeps product stock from going below zero
- powers today's total sales

## Notification APIs

```http
GET /api/notifications
POST /api/notifications
PATCH /api/notifications/:id/read
DELETE /api/notifications/:id
DELETE /api/notifications
```

Create notification:

```json
{
  "title": "Low Stock Alert",
  "message": "Milk stock is below 5 units.",
  "type": "low_stock",
  "icon": "warning-outline"
}
```

Notifications are saved in MongoDB and sent to the user's mobile number through the WhatsApp service. The default `WHATSAPP_PROVIDER=mock` logs the message safely.

## Dashboard API

```http
GET /api/dashboard
```

Returns:

- today's total sales
- today's items sold
- total products
- low stock items
- unread notification count
- priority alerts
- top performing items
- FIFO products grouped by category

## Analytics APIs

```http
GET /api/analytics
POST /api/analytics/occasion
```

Analytics returns:

- weekly sales from bills
- top selling products
- slow moving products
- stock predictions from `ML_PREDICTION_URL`

Occasion body:

```json
{
  "occasion": "Diwali"
}
```

Supported occasion examples:

- Diwali
- Holi
- Eid/Ramadan
- Christmas
- New Year
- Ganesh Chaturthi
- Navratri/Dussehra
- Raksha Bandhan
- wedding season
- weekend sale

## Frontend Integration Notes

The current React Native frontend is mock/local. To connect it:

- Store the JWT returned by login/register.
- Send `Authorization: Bearer token` on protected API calls.
- Replace `mockCatalog` lookups with `/api/scan` or `/api/products/barcode/:barcode`.
- Send OCR-created products to `POST /api/products`.
- Queue offline products locally, then upload them to `POST /api/sync` when online.
- Use `/api/bills/summary/today` or `/api/dashboard` for today's sale card.
- Use `/api/analytics` for the Analytics screen and ML stock prediction.
- Use `/api/notifications` for the Notifications screen.
