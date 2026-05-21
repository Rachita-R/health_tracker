# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/
RUN npm run install-backend && npm run install-frontend

COPY . .
RUN cd frontend && npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/frontend/dist ./frontend/dist

EXPOSE 5001
ENV PORT=5001
ENV NODE_ENV=production

CMD ["node", "backend/server.js"]
