FROM node:18-alpine

RUN apk add --no-cache curl
WORKDIR /app

COPY package.json ./
RUN npm install

COPY contracts/ ./contracts/
COPY scripts/ ./scripts/
COPY hardhat.config.cjs ./

RUN npx hardhat compile

EXPOSE 8545

CMD ["npx", "hardhat", "node", "--hostname", "0.0.0.0"]