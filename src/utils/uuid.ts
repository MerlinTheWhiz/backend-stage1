import { v7 as uuidv7 } from 'uuid';

export const generateUUID = (): string => {
  return uuidv7();
};