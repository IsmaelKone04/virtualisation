# Dockerfile — Frontend (Nginx) adapté pour Render
FROM nginx:alpine

# Copier le HTML
COPY index.html /usr/share/nginx/html/index.html

# Copier la config Nginx (avec le placeholder BACKEND_URL)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le script de démarrage
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

# Le script injecte BACKEND_URL puis démarre Nginx
CMD ["/docker-entrypoint.sh"]