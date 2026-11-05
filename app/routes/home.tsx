import type { Route } from "./+types/home";
import { MainScreen } from "../src/components/MainScreen"; // Adjust relative path if needed

export function meta({}: Route.MetaArgs) {
  return [
    { title: "RPG Game - Main Menu" },
    { name: "description", content: "Welcome to the RPG Game!" },
  ];
}

export default function Home() {
  return <MainScreen />;
}