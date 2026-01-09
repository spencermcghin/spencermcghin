import { Request, Response } from 'express';
import { Character, CreateCharacterDTO } from '../models/Character';

// In-memory storage for demonstration (replace with database later)
let characters: Character[] = [];

export const getAllCharacters = (req: Request, res: Response) => {
  res.json(characters);
};

export const getCharacterById = (req: Request, res: Response) => {
  const { id } = req.params;
  const character = characters.find(c => c.id === id);

  if (!character) {
    return res.status(404).json({ message: 'Character not found' });
  }

  res.json(character);
};

export const createCharacter = (req: Request, res: Response) => {
  const characterData: CreateCharacterDTO = req.body;

  const newCharacter: Character = {
    id: Date.now().toString(),
    ...characterData,
    skills: characterData.skills || [],
    inventory: characterData.inventory || [],
    notes: characterData.notes || '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  characters.push(newCharacter);
  res.status(201).json(newCharacter);
};

export const updateCharacter = (req: Request, res: Response) => {
  const { id } = req.params;
  const characterIndex = characters.findIndex(c => c.id === id);

  if (characterIndex === -1) {
    return res.status(404).json({ message: 'Character not found' });
  }

  characters[characterIndex] = {
    ...characters[characterIndex],
    ...req.body,
    updatedAt: new Date(),
  };

  res.json(characters[characterIndex]);
};

export const deleteCharacter = (req: Request, res: Response) => {
  const { id } = req.params;
  const characterIndex = characters.findIndex(c => c.id === id);

  if (characterIndex === -1) {
    return res.status(404).json({ message: 'Character not found' });
  }

  characters.splice(characterIndex, 1);
  res.status(204).send();
};
