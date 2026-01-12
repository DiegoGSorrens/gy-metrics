# Gy Metrics

Este projeto foi desenvolvido como parte de um teste técnico para demonstrar conhecimentos em backend, frontend, mensageria, processamento assíncrono e docker.

## Visão Geral

A aplicação permite:
- Upload de arquivos
- Processamento assíncrono via fila
- Armazenamento dos dados em banco
- Consulta de dados agregados
- Geração de relatório em Excel

## Arquitetura

A solução é dividida em:

- **API (NestJS)**  
  Responsável pelo upload do arquivo, envio da mensagem para a fila e exposição dos endpoints.

- **Worker (NestJS)**  
  Responsável por consumir a fila, ler o arquivo no storage e salvar os dados no banco.

- **RabbitMQ**  
  Usado para desacoplar o upload do processamento.

- **PostgreSQL**  
  Banco utilizado para persistir e consultar os dados.

- **Azure Blob Storage (Azurite)**  
  Usado para armazenar os arquivos enviados.

- **Frontend (Angular + PrimeNG)**  
  Interface para upload, visualização das agregações e geração do relatório.

## Fluxo da Aplicação

1. O usuário faz upload do arquivo pelo frontend
2. A API salva o arquivo no storage e envia o nome para a fila
3. O worker consome a fila e processa o arquivo
4. Os dados são salvos no banco
5. O usuário pode consultar agregações ou gerar um relatório Excel

## Agregações

O sistema permite agregações por:
- DAY
- MONTH
- YEAR

As consultas são feitas usando SQL puro para melhor performance.

Após subir os containers, os serviços ficam disponíveis em:

Frontend (Angular)
http://localhost:4200

API Backend (NestJS)
http://localhost:3000

Swagger (Documentação da API)
http://localhost:3000/docs

RabbitMQ Management
http://localhost:15672

## Execução do Projeto

Pré-requisitos:
- Docker
- Docker Compose

Para subir o projeto:
```bash
docker-compose up --build
