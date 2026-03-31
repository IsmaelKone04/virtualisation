# ── Dockerfile — Frontend (Nginx) ────────────────────────────────
# Sert le fichier HTML statique et redirige les appels /api vers le backend

FROM nginx:alpine

# Copie de le fichier HTML dans le dossier servi par Nginx
COPY index.html /usr/share/nginx/html/index.html

# Copie de la config Nginx personnalisée (proxy vers backend)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]