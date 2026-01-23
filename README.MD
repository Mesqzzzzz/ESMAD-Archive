# ESMAD Academic Repository

Plataforma distribuída para gestão e consulta de projetos académicos, desenvolvida com **arquitetura de microserviços**, **Docker Swarm**, **API Gateway**, **GraphQL** e **REST**.

O sistema permite:

- Autenticação de utilizadores
- Criação e consulta de projetos académicos
- Upload e gestão de ficheiros (MinIO / S3)
- Notificações assíncronas (RabbitMQ)
- Documentação centralizada via API Gateway

---

## 🧱 Arquitetura

O projeto é composto pelos seguintes serviços:

- **frontend** – Interface web (Nginx)
- **api-gateway** – Ponto único de entrada (porta 3000)
- **users-service** – Autenticação e gestão de utilizadores
- **projects-service** – Gestão de projetos (GraphQL)
- **files-manager-service** – Upload e gestão de ficheiros (FastAPI)
- **notifications-service** – Notificações assíncronas
- **postgres** – Base de dados relacional
- **minio** – Armazenamento de ficheiros (S3 compatível)
- **rabbitmq** – Message broker

---

## 📋 Pré-requisitos

Antes de começar, garante que tens instalado:

- **Docker Desktop** (com suporte a Swarm)
- **Git**
- Sistema operativo: Windows / Linux / macOS

Verificar Docker:

```bash
docker --version
🚀 Como executar o projeto
1️⃣ Clonar o repositório
git clone <url-do-repositorio>
cd ESMAD-Archive
2️⃣ Inicializar Docker Swarm
Se ainda não estiver ativo:

docker swarm init
(Se já estiver ativo, este comando vai falhar — é normal.)

3️⃣ Fazer deploy da stack
A partir da raiz do projeto:

docker stack deploy -c docker-compose.yml esmad
Isto irá:

Criar a rede overlay

Iniciar todos os serviços

Ligar os containers entre si

4️⃣ Verificar estado dos serviços
docker service ls
Todos os serviços devem estar com REPLICAS = 1/1.

🌐 Acessos principais
🔹 Frontend
http://localhost:8080
🔹 API Gateway
http://localhost:3000
Health check:

GET http://localhost:3000/health
🔹 Documentação central
http://localhost:3000/docs
Inclui links para:

Swagger do API Gateway

Swagger do Files Manager

GraphQL do Projects Service

🔹 GraphQL (Projects Service)
Através do gateway:

http://localhost:3000/graphql
POST /graphql → queries e mutations

Interface interativa disponível no browser

🔹 Files Manager (Swagger / OpenAPI)
Via gateway:

http://localhost:3000/files/docs
🔹 MinIO (gestão de ficheiros)
http://localhost:9001
Credenciais por defeito:

user: minioadmin
password: minioadmin
🔹 RabbitMQ (gestão)
http://localhost:15672
Credenciais:

user: guest
password: guest
🔐 Autenticação
Registo
POST /auth/register
Login
POST /auth/login
Resposta inclui:

JWT Token

Dados do utilizador

O token deve ser enviado nos pedidos protegidos:

Authorization: Bearer <token>
🛑 Parar o projeto
Remover a stack:

docker stack rm esmad
(Os volumes persistentes mantêm os dados.)

🧪 Debug útil
Logs de um serviço:

docker service logs esmad_api-gateway
Entrar num container:

docker exec -it <container_id> sh
📌 Notas finais
O projeto foi desenvolvido com foco em infraestrutura distribuída

Cada serviço corre no seu próprio container

Comunicação interna feita por hostname (Docker Swarm DNS)

O API Gateway centraliza REST, GraphQL e documentação

👨‍💻 Autor
Projeto académico desenvolvido no âmbito da unidade curricular Sistemas de Informação em Cloud / Infraestruturas Distribuídas – ESMAD.
```
