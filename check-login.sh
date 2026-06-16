#!/bin/bash
DATA='{"email":"admin@serpely.com","password":"Admin@123"}'
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "$DATA" 2>&1
echo ""
