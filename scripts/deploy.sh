#!/bin/bash

# Exit on error
set -e

# Load environment variables from .env if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env..."
  export $(cat .env | grep -v '^#' | grep -v '^$' | xargs)
fi

# Required variables with defaults
PROJECT_ID=${GCP_PROJECT_ID:-"xavier-platform"}
REGION=${GCP_REGION:-"us-central1"}
SERVICE_NAME=${GCP_SERVICE_NAME:-"xavi-api"}
REPOSITORY=${GCP_REPOSITORY:-"xavi-api"}
SERVICE_ACCOUNT=${GCP_SERVICE_ACCOUNT:-"xavi-api-sa@${PROJECT_ID}.iam.gserviceaccount.com"}

# Construct image name
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/app:latest"

echo "=========================================="
echo "🚀 Deploying to Google Cloud Run"
echo "=========================================="
echo "Project ID: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Service: ${SERVICE_NAME}"
echo "Image: ${IMAGE_NAME}"
echo "=========================================="

# Step 1: Build Docker image
echo ""
echo "📦 Step 1/3: Building Docker image..."
docker build -t "${IMAGE_NAME}" .

# Step 2: Push to Artifact Registry
echo ""
echo "⬆️  Step 2/3: Pushing image to Artifact Registry..."
docker push "${IMAGE_NAME}"

# Step 3: Deploy to Cloud Run
echo ""
echo "☁️  Step 3/3: Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE_NAME}" \
  --platform=managed \
  --region="${REGION}" \
  --allow-unauthenticated \
  --service-account="${SERVICE_ACCOUNT}" \
  --set-secrets="DATABASE_URL=database-url:latest,JWT_ACCESS_SECRET=jwt-secret:latest,JWT_REFRESH_SECRET=jwt-secret:latest,REDIS_URL=redis-url:latest" \
  --set-env-vars="NODE_ENV=production,EMAIL_API_KEY=${EMAIL_API_KEY},EMAIL_FROM=${EMAIL_FROM:-noreply@alejosworld.com},EMAIL_OTP_EXPIRATION_MINUTES=${EMAIL_OTP_EXPIRATION_MINUTES:-15}" \
  --memory=1Gi \
  --cpu=2 \
  --timeout=600 \
  --max-instances=10 \
  --min-instances=0 \
  --cpu-boost

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "=========================================="
echo ""
echo "Service URL:"
gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format="value(status.url)"
echo ""
