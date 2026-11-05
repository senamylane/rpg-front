// app/routes/character.new.tsx
import { CreateCharacterScreen } from "../src/components/CreateCharacterScreen";

export function meta() {
  return [
    { title: "New Character - RPG Game" },
  ];
}

export default function NewCharacter() {
  return <CreateCharacterScreen />;
}