#!/bin/bash
# VMS Quick Setup & Start Script

set -e

echo "🚀 VMS - Video Management System"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check Docker
echo -e "${YELLOW}1. Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found!${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✓ Docker $(docker --version)${NC}"
echo -e "${GREEN}✓ Docker Compose $(docker compose version)${NC}"

# Check environment
echo ""
echo -e "${YELLOW}2. Checking environment...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ Created .env${NC}"
else
    echo -e "${GREEN}✓ .env exists${NC}"
fi

# Create directories
echo ""
echo -e "${YELLOW}3. Creating directories...${NC}"
mkdir -p data/recordings logs testing/videos
touch data/recordings/.gitkeep
echo -e "${GREEN}✓ Directories created${NC}"

# Check /dev/dri
echo ""
echo -e "${YELLOW}4. Checking Intel QuickSync...${NC}"
if [ -d /dev/dri ]; then
    ls -la /dev/dri/ | grep -E "renderD|card" && echo -e "${GREEN}✓ DRI devices found${NC}" || echo -e "${YELLOW}⚠ DRI devices may not be accessible${NC}"
else
    echo -e "${YELLOW}⚠ /dev/dri not found - QuickSync may not work${NC}"
fi

# Pull images (optional - for faster first start)
echo ""
echo -e "${YELLOW}5. Pulling base Docker images...${NC}"
docker pull postgres:15-alpine &
docker pull redis:7-alpine &
docker pull node:20-alpine &
wait
echo -e "${GREEN}✓ Base images ready${NC}"

# Start services
echo ""
echo -e "${YELLOW}6. Starting VMS services...${NC}"
docker compose up -d

# Wait for services
echo ""
echo -e "${YELLOW}7. Waiting for services to be healthy...${NC}"
sleep 5

# Check status
echo ""
echo -e "${GREEN}=================================="
echo "VMS Services Status:"
echo "==================================${NC}"
docker compose ps

# Show endpoints
echo ""
echo -e "${GREEN}🎉 VMS is running!${NC}"
echo ""
echo -e "${YELLOW}Access endpoints:${NC}"
echo "  Frontend:  http://localhost:8080"
echo "  API:       http://localhost:3000"
echo "  API Docs:  http://localhost:3000/api/docs"
echo "  Database:  localhost:5432"
echo "  Redis:     localhost:6379"
echo ""
echo -e "${YELLOW}Default credentials:${NC}"
echo "  Username: admin"
echo "  Password: admin123"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo "  View logs:        docker compose logs -f"
echo "  Stop services:    docker compose down"
echo "  Restart:          docker compose restart"
echo "  Check status:     docker compose ps"
echo ""
echo -e "${GREEN}📖 Read QUICKSTART.md for more information!${NC}"
