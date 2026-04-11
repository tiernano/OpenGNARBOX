FROM python:3.11-alpine

# Install rsync and other necessary system utilities
RUN apk add --no-cache rsync

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files (frontend will be mounted or copied here, but for now we mount it in compose)
COPY . /app/backend
WORKDIR /app/backend

# Expose port and start FastAPI
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
