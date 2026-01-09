export interface Character {
  id: string;
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  attributes: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  skills: string[];
  inventory: string[];
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCharacterDTO {
  name: string;
  race: string;
  class: string;
  level: number;
  background: string;
  attributes: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  skills?: string[];
  inventory?: string[];
  notes?: string;
}
