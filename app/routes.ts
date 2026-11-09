import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("character/new", "routes/character.new.tsx"),
  route("character/select", "routes/character.select.tsx"), 
  route("game/:characterId", "routes/game.$characterId.tsx"),
  route("battle/:battleId", "routes/battle.$battleId.tsx"),
] satisfies RouteConfig;