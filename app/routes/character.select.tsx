// app/routes/character.select.tsx
import { SelectCharacterScreen } from "../src/components/SelectCharacterScreen";

export function meta() {
  return [
    { title: "RPG Realm - Select Hero" },
  ];
}

export default function SelectCharacterRoute() {
  return <SelectCharacterScreen />;
}