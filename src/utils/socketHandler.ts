import { Message, ChatServer, User, PrivateChat } from './chat';
import Logger from '@ptkdev/logger';
import socketio from 'socket.io';

const allUsers = new Map();

const handleSocket = (io: socketio.Server, chatServer: ChatServer, logger: Logger) => {
  io.on("connection", (socket) => {
    var user: User;

    logger.info(`New connection - ${socket.id}`);

    socket.on(
      "register",
      (regUser: any) => {

        user = { ...regUser, idCard: regUser.id_card }

        if (user) {
          logger.info(`[${user.idCard}] ${user.name} - ${user.role} registered`);

          allUsers.set(user.idCard, socket.id);

          if (user.role === "GURU" || user.role === "BK") {
            socket.broadcast.emit("teacherOnline", { user, socketId: socket.id });
            chatServer.addTeacher(user)
          } else {
            socket.broadcast.emit("studentOnline", { user, socketId: socket.id });
            chatServer.addStudent(user)
          }
        }
      }
    );

    socket.on("getStats", () => {
      if (user) {
        logger.info(`${user.name} request stats`);
        var onlineUsers = chatServer.onlineStudents;
        if (user.role === 'SISWA') {
          onlineUsers = chatServer.onlineTeachers;
        }
        socket.emit("statsLoaded", { rooms: [], onlineUsers })
      }
    })

    socket.on("join", (roomId: string) => {
      if (user) {
        logger.info(`${user.name} join to room ${roomId}`);
        socket.join(roomId);
      }
    });

    socket.on("leave", (roomId: string) => {
      if (user) {
        logger.info(`${user.name} leave room '${roomId}'`);
        socket.leave(roomId);
      }
    });

    socket.on(
      "sendMessage",
      ({ message, roomId }: { message: Message, roomId: string }) => {
        socket.broadcast.to(roomId).emit("message", message);
        socket.broadcast.emit("roomUpdated", { rooms: [] });
      }
    );

    // socket.on("loadPrivateMessages", (opponentId: string) => {
    //   const room = privateChat.getRoom(opponentId)
    //   if (room) {
    //     socket.emit("privateMessagesLoaded", { messages: room != null ? room.messages : [] })
    //     if (room.unreadCount > 0) {
    //       room.resetUnreadCount()
    //       socket.emit("roomUpdated", { rooms: chatServer.rooms.concat(privateChat.rooms) })
    //     }
    //   }
    // });

    // socket.on("resetCount", (opponentId: string) => {
    //   const room = privateChat.getRoom(opponentId)
    //   if (room) {
    //     if (room.unreadCount > 0) {
    //       room.resetUnreadCount()
    //       socket.emit("roomUpdated", { rooms: chatServer.rooms.concat(privateChat.rooms) })
    //     }
    //   }
    // });

    socket.on("getSocketId", ({ idCard, role }: { idCard: string, role: any }) => {
      if (user) {
        logger.info(`${user.name} request socket id for ${idCard}`)

        const socketId = allUsers.get(idCard);
        if (socketId) {
          logger.info(`[${socketId}] socket id for ${idCard}`)
          socket.emit("gotSocketId", socketId);
        }
      }
    });

    socket.on("sendPrivateMessage", ({ socketId, message, opponent, senderId, conversationId }: { socketId: string, message: Message, senderId: any, opponent: User, conversationId: number }) => {
      // send message to opponent socket id
      socket.to(socketId).emit("gotPrivateMessage", { message, user: opponent, senderId, conversationId })
      // update opponent rooms
      socket.to(socketId).emit("roomUpdated", { rooms: [] })
      // update current user rooms
      socket.emit("roomUpdated", { rooms: [] })
    });

    socket.on("privateTyping", (socketId) => {
      if (user) {
        socket.to(socketId).emit("typing", { roomId: user.idCard, who: user })
      }
    });

    socket.on("typing", (roomId) => {
      if (user) {
        socket.broadcast.to(roomId).emit("typing", { roomId, who: user });
        socket.broadcast.emit("bcTyping", { roomId, who: user });
      }
    });

    socket.on("disconnect", (reason) => {
      if (user) {
        allUsers.delete(user.idCard);

        logger.warning(`${user.name} disconnect with reason ${reason}`);

        if (user.role === "GURU" || user.role === "BK") {
          socket.broadcast.emit("teacherOffline", user);
          chatServer.removeTeacher(user)
        } else {
          socket.broadcast.emit("studentOffline", user);
          chatServer.removeStudent(user)
        }
      }
    });
  });
};

export default handleSocket;
