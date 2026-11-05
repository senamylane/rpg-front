// app/routes/battle.$characterId.tsx
import { BattleScreen } from "../src/components/BattleScreen";

export function meta() {
  return [
    { title: "RPG Realm - Battle" },
  ];
}

export default function BattleRoute() {
  return <BattleScreen />;
}