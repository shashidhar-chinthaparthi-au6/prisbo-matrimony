#!/bin/bash

# CORS Testing Script for Prisbo Matrimony API
# Usage: ./test-cors.sh [local|production]

ENV=${1:-local}

if [ "$ENV" = "local" ]; then
  BASE_URL="http://localhost:5000"
  ORIGIN="http://localhost:5173"
else
  BASE_URL="https://prisbo-matrimony.vercel.app"
  ORIGIN="https://prisbo-matrimony-756y.vercel.app"
fi

echo "=========================================="
echo "Testing CORS for: $BASE_URL"
echo "Origin: $ORIGIN"
echo "=========================================="
echo ""

# Test 1: Health Check
echo "1. Testing Health Check (GET /api/health)"
echo "----------------------------------------"
curl -i "$BASE_URL/api/health"
echo ""
echo ""

# Test 2: OPTIONS Preflight Request
echo "2. Testing CORS Preflight (OPTIONS /api/auth/login)"
echo "----------------------------------------"
curl -i -X OPTIONS "$BASE_URL/api/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization"
echo ""
echo ""

# Test 3: POST Request with CORS Headers
echo "3. Testing POST Request with CORS (POST /api/auth/login)"
echo "----------------------------------------"
curl -i -X POST "$BASE_URL/api/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  -H "Access-Control-Request-Method: POST" \
  -d '{"email":"test@example.com","password":"test123"}'
echo ""
echo ""

# Test 4: Check CORS Headers in Response
echo "4. Checking CORS Headers in Response"
echo "----------------------------------------"
curl -s -o /dev/null -w "\nCORS Headers:\nAccess-Control-Allow-Origin: %{header_access-control-allow-origin}\nAccess-Control-Allow-Methods: %{header_access-control-allow-methods}\nAccess-Control-Allow-Headers: %{header_access-control-allow-headers}\nAccess-Control-Allow-Credentials: %{header_access-control-allow-credentials}\n" \
  -X OPTIONS "$BASE_URL/api/auth/login" \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST"
echo ""
echo ""

echo "=========================================="
echo "Test Complete"
echo "=========================================="
