# Teste GY

Projeto composto por:

- Backend (NestJS)
- Worker (NestJS + RabbitMQ)
- PostgreSQL
- Azure Blob (Azurite)

Fluxo:
1. Upload de CSV
2. Processamento assíncrono via Worker
3. Armazenamento no banco
4. Agregações e relatório Excel
 
