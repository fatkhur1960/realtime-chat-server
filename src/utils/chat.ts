import { v4 as uuidv4 } from 'uuid';

export type User = {
    id: String;
    idCard?: String;
    name?: String;
    role?: String;
}

export type ImageMessage = {
    uri: String;
    imageName: String;
    size: Number;
    width?: Number;
}

export type FileMessage = {
    uri: String;
    fileName: String;
    size: Number;
    mimeType?: String;
}

export type Message = {
    id: String;
    sender: User;
    text?: String;
    type: String;
    date: Date;
    image?: ImageMessage;
    file?: FileMessage;
}


export class Room {
    id: string;
    name: string;
    users: Array<User>;
    messages: Array<Message>;
    lastMessage?: Message;
    type?: string;
    unreadCount: number;

    constructor(id: string, name: string, users: User[], type?: string) {
        this.id = id;
        this.name = name;
        this.users = users;
        this.messages = [];
        this.lastMessage = {
            id: uuidv4(),
            sender: { id: uuidv4(), idCard: uuidv4(), name: "System", role: "system" },
            text: "Room created",
            type: "info",
            date: new Date()
        }
        this.type = type;
        this.unreadCount = 0;
    }

    joinRoom(user: User) {
        this.users.push(user)
    }

    sendMessage(message: Message) {
        this.messages.push(message)
        this.setLastMessage(message)
    }

    setLastMessage(message: Message) {
        this.lastMessage = message
    }

    leaveRoom(userId: String) {
        const index = this.users.findIndex((u) => u.id == userId)

        if (index !== -1) {
            this.users.splice(index, 1)
        }
    }

    incUnreadCount = () => this.unreadCount++;
    resetUnreadCount = () => this.unreadCount = 0;
}

export class PrivateChat {
    userId: String;
    rooms: Room[];

    constructor(userId: String) {
        this.userId = userId;
        this.rooms = []
    }

    createRoom(opponent: User): Room {
        const room = new Room(opponent.idCard as string, opponent.name as string, [opponent], "Messages");
        this.rooms.push(room);
        return room;
    }

    getRoom(opponentId: String): Room {
        return this.rooms.find((r) => r.id == opponentId)
    }
}

export class ChatServer {
    rooms: Array<Room>;
    onlineStudents: Array<User>;
    onlineTeachers: Array<User>;
    privateChats: Array<PrivateChat>

    constructor(rooms: Room[]) {
        this.rooms = rooms
        this.onlineStudents = []
        this.onlineTeachers = []
        this.privateChats = []
    }

    getRoom(roomId: string): Room {
        return this.rooms.find((r) => r.id == roomId)
    }

    isRoomExists(roomId: string): Boolean {
        return this.getRoom(roomId) != undefined
    }

    getStudent(idCard: String): User {
        return this.onlineStudents.find((s) => s.idCard === idCard)
    }

    getTeacher(idCard: String): User {
        return this.onlineTeachers.find((s) => s.idCard === idCard)
    }

    addStudent(user: User) {
        if(this.getStudent(user.idCard)) {
            this.removeStudent(user)
        }
        this.onlineStudents.push(user)
    }

    removeStudent(user: User) {
        const index = this.onlineStudents.findIndex((u) => u.id == user.id)

        if (index !== -1) {
            this.onlineStudents.splice(index, 1)
        }
    }

    addTeacher(user: User) {
        if(this.getTeacher(user.idCard)) {
            this.removeTeacher(user)
        }
        this.onlineTeachers.push(user)
    }

    removeTeacher(user: User) {
        const index = this.onlineTeachers.findIndex((u) => u.id == user.id)

        if (index !== -1) {
            this.onlineTeachers.splice(index, 1)
        }
    }

    addPrivateChatByUserId(idCard: String): PrivateChat {
        const pvc = new PrivateChat(idCard)
        this.privateChats.push(pvc)

        return pvc
    }

    getPrivateChatByUserId(idCard: String): PrivateChat {
        return this.privateChats.find((c) => c.userId == idCard)
    }
}
