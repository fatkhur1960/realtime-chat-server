import express from 'express';
import socketio from 'socket.io';
import http from 'http';

import Logger from '@ptkdev/logger';
import { ChatServer } from './utils/chat';
import handleSocket from './utils/socketHandler';
import initRooms from './utils/rooms';

const app = express();
const server = http.createServer(app);
const io = new socketio.Server(server);
const logger = new Logger();
const chatServer = new ChatServer(initRooms());

const port = process.env.PORT || 8888;

handleSocket(io, chatServer, logger)

server.listen(port, () => {
  logger.info(`Listening on ${port}`);
});
