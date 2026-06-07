#!/bin/bash
cat > /var/www/serpely/server/.env << 'ENVEOF'
PORT=4000
CLIENT_ORIGIN=https://serpely.com,http://localhost:5173
UPLOAD_BASE_URL=https://serpely.com
MONGO_URI=mongodb://127.0.0.1:27017/Serpely
JWT_SECRET=f51bbcadee768532fab839cd8ce994360c0f0503ba9d0bceca7ae2b2295eb4f77aba50d3323505ed333494bbfa65cb94
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ADMIN_EMAIL=admin@serpely.com
ADMIN_PASSWORD=Admin@123
ENVEOF
echo "--- .env written correctly ---"
cat /var/www/serpely/server/.env
