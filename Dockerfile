FROM node:latest

WORKDIR /app
RUN yarn global add pm2

COPY . ./
RUN yarn install && yarn build

CMD pm2-runtime process.yml