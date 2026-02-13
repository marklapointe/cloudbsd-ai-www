#!/bin/sh
set -e

# If SSL is enabled, configure Nginx to use it
if [ "$SSL_ENABLED" = "true" ]; then
    echo "Configuring Nginx for SSL..."
    cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVERNAME:-localhost};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${SERVERNAME:-localhost};

    ssl_certificate ${SSL_CERT_PATH:-/etc/nginx/ssl/cert.pem};
    ssl_certificate_key ${SSL_KEY_PATH:-/etc/nginx/ssl/key.pem};

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
else
    echo "Configuring Nginx for HTTP only..."
    cat <<EOF > /etc/nginx/conf.d/default.conf
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVERNAME:-localhost};

    location / {
        root   /usr/share/nginx/html;
        index  index.html index.htm;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
fi

exec "$@"
