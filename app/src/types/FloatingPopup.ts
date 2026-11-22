interface FloatingPopup {
    id: string;
    targetKey: string; // e.g. `PLAYER_${hero.id}` or enemy.enemy_id
    text: string;
    variant: "damage" | "heal" | "mana";
}
