FROM node:latest

RUN yarn add global gulp

WORKDIR /app

COPY . /app
RUN yarn
RUN yarn build

EXPOSE 3000

CMD ["node", "dist/server.js"]
