import React, { Component } from "react";
import type { BattleEnemy, SpellConfig } from "../../api/battleApi";
import '../css/BattleScreen.css';

interface EnemyCardProps {
  enemy: BattleEnemy;
  isThisEnemyActive: boolean;
  onClick: (enemy: BattleEnemy) => void;
  isSelectingTarget: boolean;
  selectedSpell: SpellConfig|null;
  damagedEntity: string|null;
  isSomeoneElseAttacking: boolean;
  isSelectedForSpell: boolean;
}

export const EnemyCard: React.FC<EnemyCardProps> = ({
  enemy,
  isThisEnemyActive,
  onClick,
  isSelectingTarget,
  selectedSpell,
  damagedEntity,
  isSomeoneElseAttacking,
  isSelectedForSpell,
}) => {
  return (
    <div key={enemy.enemy_id} style={styles.enemyWrapper}>
      <div style={styles.characterName}>
        {enemy.name}
        {isThisEnemyActive && enemy.hp > 0 && <span className="attacking-icon">⚔️</span>}
      </div>
      <div
        onClick={() => onClick(enemy)}
        className={`
                    card-animated
                    ${(isSelectingTarget || selectedSpell) && enemy.hp > 0 ? "targetable-enemy" : ""} 
                    ${damagedEntity === enemy.enemy_id ? "card-damaged" : ""}
                    ${isThisEnemyActive && enemy.hp > 0 ? "card-active-enemy" : ""}
                    ${isSomeoneElseAttacking ? "card-dimmed" : ""}
                    ${isSelectedForSpell ? "card-targeted" : ""} <!-- AQUI APLICA O VISUAL ROXO/ZOOM -->
                  `}
        style={{
          ...styles.card,
          opacity: enemy.hp <= 0 ? 0.3 : 1,
          cursor:
            (isSelectingTarget || selectedSpell) && enemy.hp > 0
              ? "crosshair"
              : "default",
        }}
      >
        <div style={styles.avatarPlaceholder} />
        <div style={styles.enemyLevel}>{enemy.level}</div>
        <div style={styles.barsContainer}>
          <div style={styles.barOuter}>
            <div
              className="hp-bar-inner"
              style={{
                width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%`,
              }}
            />
            <span style={styles.barText}>
              {Math.max(0, enemy.hp)}/{enemy.maxHp}
            </span>
          </div>
          <div style={styles.barOuter}>
            <div
              className="mana-bar-inner"
              style={{
                width: `${(enemy.mana / enemy.maxMana) * 100}%`,
              }}
            />
            <span style={styles.barText}>
              {enemy.mana}/{enemy.maxMana}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnemyCard;

const styles: Record<string, React.CSSProperties> = {
  enemyWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  card: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
    border: "3px solid #000000",
    padding: "0.5rem",
    width: "280px",
    gap: "0.5rem",
    transition: "border 0.2s, transform 0.1s",
    position: "relative"
  },
  avatarPlaceholder: {
    width: "60px",
    height: "60px",
    backgroundColor: "#3f3f46",
    border: "1px solid #71717a",
  },
  barsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    flexGrow: 1,
  },
  barOuter: {
    position: "relative",
    height: "24px",
    backgroundColor: "#000000",
    border: "2px solid #000000",
    overflow: "hidden",
  },
  barText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "0.8rem",
    fontWeight: "bold",
    color: "#ffffff",
    textShadow: "1px 1px 2px #000",
  },
  characterName: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    marginBottom: "0.3rem",
  },
  cardActive: {
    borderColor: "#3b82f6",
  },
  enemyLevel: {
    position: "absolute",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    top: 0,
    left: 0,
    backgroundColor: "gray",
    minWidth: "24px",
    maxWidth: "32px",
    borderRadius: "16px",
    color:"black"
  }
};
