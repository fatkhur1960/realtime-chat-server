import { Message, ChatServer, User, PrivateChat } from './chat';
import Logger from '@ptkdev/logger';
import socketio from 'socket.io';

const allUsers = new Map();

const handleSocket = (io: socketio.Server, chatServer: ChatServer, logger: Logger) => {
  io.on("connection", (socket) => {
    var user: User;
    var privateChat: PrivateChat = null;

    logger.info(`New connection - ${socket.id}`);

    socket.on(
      "register",
      (regUser: any) => {
        user = { ...regUser, idCard: regUser.id_card }

        logger.info(`[${user.idCard}] ${user.name} - ${user.role} registered`);

        // create private chat if not exist
        // privateChat = chatServer.getPrivateChatByUserId(user.idCard)
        // if (!privateChat) {
        //   privateChat = chatServer.addPrivateChatByUserId(user.idCard);
        //}

        allUsers.set(user.idCard, socket.id);

        if (user.role === "GURU" || user.role === "BK") {
          socket.broadcast.emit("teacherOnline", user);
          // chatServer.addTeacher(user)
        } else {
          socket.broadcast.emit("studentOnline", user);
          //chatServer.addStudent(user)
        }
      }
    );

    socket.on("getStats", () => {
      logger.info(`${user.name} request stats`);
      var onlineUsers = chatServer.onlineStudents;
      if (user.role === 'SISWA') {
        onlineUsers = chatServer.onlineTeachers;
      }
      socket.emit("statsLoaded", { rooms: [], onlineUsers })
    })

    socket.on("join", (roomId: string) => {
      logger.info(`${user.name} join to room ${roomId}`);
      socket.join(roomId);
    });

    socket.on("leave", (roomId: string) => {
      logger.info(`${user.name} leave room '${roomId}'`);
      socket.leave(roomId);
    });

    socket.on(
      "sendMessage",
      ({ message, roomId }: { message: Message, roomId: string }) => {
        socket.broadcast.to(roomId).emit("message", message);
        socket.broadcast.emit("roomUpdated", { rooms: [] });
      }
    );

    socket.on("loadPrivateMessages", (opponentId: string) => {
      const room = privateChat.getRoom(opponentId)
      if (room) {
        socket.emit("privateMessagesLoaded", { messages: room != null ? room.messages : [] })
        if (room.unreadCount > 0) {
          room.resetUnreadCount()
          socket.emit("roomUpdated", { rooms: chatServer.rooms.concat(privateChat.rooms) })
        }
      }
    });

    socket.on("resetCount", (opponentId: string) => {
      const room = privateChat.getRoom(opponentId)
      if (room) {
        if (room.unreadCount > 0) {
          room.resetUnreadCount()
          socket.emit("roomUpdated", { rooms: chatServer.rooms.concat(privateChat.rooms) })
        }
      }
    });

    socket.on("getSocketId", ({ idCard, role }: { idCard: string, role: any }) => {
      //var user: User;
      //if (role === 'GURU' || role === 'BK') {
      //  user = chatServer.onlineTeachers.find((u) => u.idCard === idCard)
      //} else {
      //  user = chatServer.onlineStudents.find((u) => u.idCard === idCard)
      //}

      //if (user) {
      //  socket.emit("gotSocketId", user.id)
      //}

      const socketId = allUsers.get(idCard);
      if (socketId) {
        socket.emit("gotSocketId", socketId);
      }
    });

    socket.on("sendPrivateMessage", ({ socketId, message, opponent }: { socketId: string, message: Message, opponent: User }) => {
      // send message to opponent socket id
      socket.to(socketId).emit("gotPrivateMessage", { message, user: opponent })
      // update opponent rooms
      socket.to(socketId).emit("roomUpdated", { rooms: [] })
      // update current user rooms
      socket.emit("roomUpdated", { rooms: [] })
    });

    socket.on("privateTyping", (socketId) => {
      socket.to(socketId).emit("typing", { roomId: user.idCard, who: user })
    });

    socket.on("typing", (roomId) => {
      socket.broadcast.to(roomId).emit("typing", { roomId, who: user });
      socket.broadcast.emit("bcTyping", { roomId, who: user });
    });

    socket.on("disconnect", (reason) => {
      //chatServer.rooms.forEach((room) => {
      //  const index = room.users.findIndex((r) => r.id == user.id);
      //  room.users.splice(index, 1);
      //});
      //
      allUsers.delete(user.idCard);

      logger.warning(`${user.name} disconnect with reason ${reason}`);

      if (user.role === "GURU" || user.role === "BK") {
        socket.broadcast.emit("teacherOffline", user);
        chatServer.removeTeacher(user)
      } else {
        socket.broadcast.emit("studentOffline", user);
        chatServer.removeStudent(user)
      }
    });
  });
};

export default handleSocket;
