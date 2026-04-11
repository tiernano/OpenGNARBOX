# Stage 1: Build Frontend (Vite)
FROM node:20-alpine AS frontend-builder
WORKDIR /app/importool
COPY importool/package.json ./
RUN npm install
COPY importool/ ./
RUN npm run build

# Stage 2: Backend (FastAPI)
FROM python:3.11-alpine
WORKDIR /app

# Install dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Source
COPY backend/ ./

# Copy Frontend Build to backend's frontend/dist
COPY --from=frontend-builder /app/importool/dist ./frontend/dist

# Expose port and start FastAPI
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
