import { Message, ChatServer, User, PrivateChat } from './chat';
import Logger from '@ptkdev/logger';
import socketio from 'socket.io';

const handleSocket = (io: socketio.Server, chatServer: ChatServer, logger: Logger) => {
  io.on("connection", (socket) => {
    const user: User = {
      id: socket.id,
      name: null,
      role: null,
    };
    var privateChat: PrivateChat = null;

    logger.info(`New connection - ${user.id}`);

    socket.on(
      "register",
      ({ idCard, username, role }: { idCard: String, username: String, role: String }) => {
        user.name = username;
        user.role = role;
        user.idCard = idCard;

        logger.info(`[${user.idCard}] ${user.name} - ${user.role} registered`);

        // create private chat if not exist
        privateChat = chatServer.getPrivateChatByUserId(user.idCard)
        if (!privateChat) {
          privateChat = chatServer.addPrivateChatByUserId(user.idCard);
        }

        if (user.role === "Guru" || user.role === "BK") {
          socket.broadcast.emit("teacherOnline", user);
          chatServer.addTeacher(user)
        } else {
          socket.broadcast.emit("studentOnline", user);
          chatServer.addStudent(user)
        }
      }
    );

    socket.on("getStats", () => {
      logger.info(`${user.name} request stats`);
      var onlineUsers = chatServer.onlineStudents;
      if (user.role === 'Siswa') {
        onlineUsers = chatServer.onlineTeachers;
      }
      socket.emit("statsLoaded", { rooms: chatServer.rooms.concat(privateChat.rooms), onlineUsers })
    })

    socket.on("join", (roomId: string) => {
      let room = chatServer.getRoom(roomId);

      if (room) {
        room.joinRoom(user);
        logger.info(`${user.name} join to room ${room.id}`);

        socket.emit("joined", { users: room.users, messages: room.messages });
        socket.join(room.id);
      }
    });

    socket.on("leave", (roomId: string) => {
      let room = chatServer.getRoom(roomId);

      logger.info(`${user.name} leave room '${room.id}'`);

      room.leaveRoom(user.id);
      socket.leave(roomId);
    });

    socket.on(
      "sendMessage",
      ({ message, roomId }: { message: Message, roomId: string }) => {
        const room = chatServer.getRoom(roomId);
        if (room) {
          room.sendMessage(message);
          socket.broadcast.to(room.id).emit("message", message);
          socket.broadcast.emit("roomUpdated", { rooms: chatServer.rooms.concat(privateChat.rooms) });
        }
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

    socket.on("getSocketId", ({ idCard, role }: { idCard: string, role: string }) => {
      var user: User;
      if (role === 'Guru' || role === 'BK') {
        user = chatServer.onlineTeachers.find((u) => u.idCard === idCard)
      } else {
        user = chatServer.onlineStudents.find((u) => u.idCard === idCard)
      }

      if (user) {
        socket.emit("gotSocketId", user.id)
      }
    });

    socket.on("sendPrivateMessage", ({ message, opponent }: { message: Message, opponent: User }) => {
      // get current user private chat room based on opponent id
      var room = privateChat.getRoom(opponent.idCard)
      // create chat room for current user based on opponent id
      if (!room) room = privateChat.createRoom(opponent)
      room.sendMessage(message)

      // create opponentPrivate chat if not exist
      var opponentPrivateChat = chatServer.getPrivateChatByUserId(opponent.idCard);
      if (!opponentPrivateChat) {
        opponentPrivateChat = chatServer.addPrivateChatByUserId(opponent.idCard);
      }
      // create opponent private chat room if not exist
      var opponentRoom = opponentPrivateChat.getRoom(user.idCard)
      if (!opponentRoom) opponentRoom = opponentPrivateChat.createRoom(user)
      opponentRoom.sendMessage(message)
      opponentRoom.incUnreadCount()

      // send message to opponent socket id
      socket.to(opponent.id as string).emit("gotPrivateMessage", { message, user })
      // update opponent rooms
      socket.to(opponent.id as string).emit("roomUpdated", { rooms: chatServer.rooms.concat(opponentPrivateChat.rooms), })
      // update current user rooms
      socket.emit("roomUpdated", { rooms: chatServer.rooms.concat(privateChat.rooms) })
    });

    socket.on("privateTyping", (opponent: User) => {
      socket.to(opponent.id as string).emit("typing", { roomId: user.idCard, who: user })
    });

    socket.on("typing", (roomId) => {
      const room = chatServer.getRoom(roomId);
      if (room) {
        socket.broadcast.to(room.id).emit("typing", { roomId, who: user });
        socket.broadcast.emit("bcTyping", { roomId, who: user });
      }
    });

    socket.on("disconnect", (reason) => {
      chatServer.rooms.forEach((room) => {
        const index = room.users.findIndex((r) => r.id == user.id);
        room.users.splice(index, 1);
      });

      logger.warning(`${user.name} disconnect with reason ${reason}`);

      if (user.role === "Guru" || user.role === "BK") {
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
