import { Room } from './chat';
import { v4 as uuidv4 } from 'uuid';

const initRooms = (): Room[] => {
  const roomsRaw = ["IPA", "IPS", "Matematika", "Fisika", "Bahasa Inggris", "Bahasa Indonesia", "Pendidikan Agama", "Penjasorkes", "Kesenian", "Biologi", "Kimia"]
  return roomsRaw.map(name => new Room(uuidv4(), name, [], "Group"))
}

export default initRooms;