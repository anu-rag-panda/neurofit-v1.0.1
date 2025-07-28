FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]

EXPOSE 5000

# Build the Docker image with the tag "your-app-name"
# docker build -t your-app-name .