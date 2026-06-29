# Étape 1 : Build de l’application Ionic Angular
FROM node:20.19.0 AS build

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install -g @ionic/cli && npm install

# Copier tout le code
COPY . .

# Build en mode production
RUN ionic build

# Étape 2 : Utiliser Nginx pour servir l’app
FROM nginx:1.25

# Supprimer le site par défaut
RUN rm -rf /usr/share/nginx/html/*

# Copier le build Ionic dans Nginx
COPY --from=build /app/www /usr/share/nginx/html

# Copier la configuration Nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exposer le port 4201 dans le conteneur
EXPOSE 4222

# Lancer Nginx
CMD ["nginx", "-g", "daemon off;"]