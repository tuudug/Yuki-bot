#!/bin/bash
set -e

echo "=== Yuki Server Deployment Script ==="

# Update system
echo "[1/6] Updating system..."
apt update && apt upgrade -y

# Install Docker
echo "[2/6] Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Install Docker Compose plugin
echo "[3/6] Installing Docker Compose..."
apt install -y docker-compose-plugin

# Install Nginx
echo "[4/6] Installing Nginx..."
apt install -y nginx

# Install Certbot for SSL
echo "[5/6] Installing Certbot..."
apt install -y certbot python3-certbot-nginx

echo "[6/6] Setup complete!"
echo ""
echo "=== Next Steps ==="
echo "1. Create /root/yuki directory and copy your server files"
echo "2. Create .env file with your secrets"
echo "3. Run: docker compose up -d"
echo "4. Run database migrations: docker compose exec app npm run db:push"
echo "5. Configure Nginx and SSL (see instructions below)"
echo ""
echo "To setup SSL:"
echo "  1. Edit /etc/nginx/sites-available/yuki with your domain"
echo "  2. ln -s /etc/nginx/sites-available/yuki /etc/nginx/sites-enabled/"
echo "  3. rm /etc/nginx/sites-enabled/default"
echo "  4. nginx -t && systemctl reload nginx"
echo "  5. certbot --nginx -d YOUR_DOMAIN"
