#!/bin/sh
# docker-entrypoint.sh
# Ce script s'exécute au démarrage du container.
# Il remplace le placeholder dans nginx.conf par la vraie URL du backend
# (injectée par Render comme variable d'environnement BACKEND_URL).

set -e

# Vérifier que la variable est bien définie
if [ -z "$BACKEND_URL" ]; then
  echo "ERREUR : la variable d'environnement BACKEND_URL n'est pas définie."
  echo "Exemple : BACKEND_URL=https://mediasense-backend.onrender.com"
  exit 1
fi

echo "Backend URL : $BACKEND_URL"

# Remplacer le placeholder dans la config Nginx
sed -i "s|BACKEND_URL_PLACEHOLDER|$BACKEND_URL|g" /etc/nginx/conf.d/default.conf

echo "nginx.conf mis à jour, démarrage de Nginx..."

# Démarrer Nginx
exec nginx -g "daemon off;"