FROM nginx:alpine

# Limpa tudo
RUN rm -rf /usr/share/nginx/html/*

# Copia só a pasta public para o sítio certo
COPY public/ /usr/share/nginx/html/public/

# Config do nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
