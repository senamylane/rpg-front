import { InGameScreen } from "../src/components/InGameScreen";

export function meta() {
  return [
    { title: "RPG Realm - In Game" },
  ];
}

export default function GameRoute() {
  return <InGameScreen />;
}