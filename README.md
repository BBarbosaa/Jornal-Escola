# Fonte Segura - Jornal da Escola

API REST para o jornal da escola. Os jornalistas registam-se, escrevem artigos e juntam fontes. Para cada fonte a API guarda a versão arquivada no Arquivo.pt.

Feito com Node.js, TypeScript e Express.

## Requisitos

- Node.js 22.18 ou superior (corre os ficheiros .ts diretamente)
- OpenSSL (só se for preciso gerar um certificado novo)

## Instalar

```
npm install
```

## Configurar

Copiar o .env.exemplo para .env, se ainda não existir, e preencher os segredos. Para gerar cada segredo:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Certificado HTTPS

Se a chave e o certificado de teste ainda não existirem, criar a pasta certs e gerar:

```
mkdir certs
openssl req -x509 -newkey rsa:2048 -nodes -keyout certs/key.pem -out certs/cert.pem -days 365 -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

## Arrancar

```
npm run dev
```

Reinicia sozinho quando se grava um ficheiro. Para arrancar sem reiniciar:

```
npm start
```

A API fica em https://localhost:3000/api/v1

O certificado é autoassinado, por isso o browser mostra um aviso.

No Postman: Settings › Certificates › CA certificates, ligar e escolher o ficheiro certs/cert.pem. Assim o Postman confia no nosso certificado e a verificação SSL continua ligada.

## Verificar os tipos

```
npm run verificar
```

## Testes

```powershell
npm.cmd test
```

Executa a coleção Postman duas vezes com Newman, um simulador do Arquivo.pt e ficheiros de dados temporários. Não altera os dados do grupo. Este comando testa a aplicação por HTTP local; o servidor normal continua a usar HTTPS.

Para executar no Postman Runner, importar os ficheiros da pasta `postman/` e seguir o [guia da pessoa 4](docs/PESSOA4.md). Os cenários de falha da coleção exigem o simulador local. O guia contém a configuração HTTPS, os exemplos e a demonstração com o Arquivo.pt real.
