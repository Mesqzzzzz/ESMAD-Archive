FROM nginx:alpine

# Apaga a página default do nginx
RUN rm -rf /usr/share/nginx/html/*

# Copia o teu frontend (index.html, css, js, assets...) para o nginx
COPY . /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
