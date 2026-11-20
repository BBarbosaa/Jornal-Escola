# Fonte Segura - Jornal da Escola

API REST para o jornal da escola. Os jornalistas registam-se, escrevem artigos e juntam fontes. Para cada fonte a API guarda a versão arquivada no Arquivo.pt.

Feito com Node.js, TypeScript e Express.

## Requisitos

- Node.js 22.18 ou superior (corre os ficheiros .ts diretamente)
- OpenSSL (só se for preciso gerar um certificado novo)

## Instalar

npm install

## Configurar

O ficheiro .env já vem no zip. Para criar um novo, copiar o .env.exemplo para .env e preencher os segredos. Para gerar cada segredo:

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

## Certificado HTTPS

A chave e o certificado de teste estão na pasta certs. Para gerar novos:

openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost"

## Arrancar

npm run dev (reinicia sozinho quando se grava um ficheiro)
npm start

A API fica em https://localhost:3000/api/v1

O certificado é autoassinado, por isso o browser mostra um aviso. No Postman é preciso desligar "SSL certificate verification" nas Settings.

## Verificar os tipos

npm run verificar

## Testes

Importar a coleção do Postman que está na pasta do projeto e correr no Runner.