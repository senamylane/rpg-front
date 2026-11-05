// src/components/InGameScreen.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { initBattle } from "../api/battleApi";
import {
  fetchCharacterById,
  fetchActiveBattle,
  changeCharacterZone,
} from "../api/characterApi";
import type { Battle } from "../types/battle";
import type { GameCharacter } from "../types/character";
import type { ZoneType } from "../types/zone";
import { Zone } from "../types/zone";

type MenuMode = "MAIN" | "CHANGE_REGION";

interface LocationState {
  character?: GameCharacter;
}

export const InGameScreen: React.FC = () => {
  const navigate = useNavigate();
  const { characterId } = useParams<{ characterId: string }>();
  const idNum = Number(characterId);

  const [character, setCharacter] = useState<GameCharacter | null>(null);
  const [activeBattle, setActiveBattle] = useState<Battle | null>(null);
  const [menuMode, setMenuMode] = useState<MenuMode>("MAIN");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!idNum) return;

    const loadGameData = async () => {
      try {
        // If we didn't receive character from navigation state, fetch it
        const charPromise = character
          ? Promise.resolve(character)
          : fetchCharacterById(idNum);

        const [charData, battleData] = await Promise.all([
          charPromise,
          fetchActiveBattle(idNum),
        ]);

        setCharacter(charData);
        setActiveBattle(battleData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Error loading game data",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadGameData();
  }, [idNum]);

  const handleBattleClick = async () => {
    if (isNewBattleDisabled) return;
    if (!idNum) return;
    try {
      if (activeBattle) {
        navigate(`/battle/${activeBattle.id}`);
      } else {
        const newBattle = await initBattle(idNum);
        navigate(`/battle/${newBattle.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start battle");
    }
  };

  const handleZoneSelect = async (zone: ZoneType) => {
    if (!idNum) return;

    try {
      setError(null);
      const success = await changeCharacterZone(idNum, zone);

      if (success) {
        // 1. Atualiza a zona no estado local do personagem
        setCharacter((prev) => (prev ? { ...prev, currentZone: zone } : null));

        // 2. Retorna para o menu principal de ações
        setMenuMode("MAIN");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao alterar região");
    }
  };

  if (isLoading) {
    return <div style={styles.container}>Loading game...</div>;
  }

  // Format zone display name (e.g. CAMP_SITE -> Camp Site)
  const formattedRegion = character?.currentZone
    ? character.currentZone
        .replace("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase())
    : "Camp Site";

  const hpPercent = character
    ? Math.max(0, Math.min(100, (character.hp / character.maxHp) * 100))
    : 100;
  const manaPercent = character
    ? Math.max(0, Math.min(100, (character.mana / character.maxMana) * 100))
    : 100;
  const isCampSite = character?.currentZone === "CAMP_SITE";
  const isNewBattleDisabled = !activeBattle && isCampSite;
  return (
    <div style={styles.container}>
      {/* Outer Blue Container Wireframe */}
      <div style={styles.gameFrame}>
        {/* Top Header Section */}
        <div style={styles.header}>
          {/* Character Status Box (Left) */}
          <div style={styles.characterBox}>
            <div style={styles.avatar}>
              <img
                src="https://api.dicebear.com/7.x/pixel-art/svg?seed=hero"
                alt="Portrait"
                style={{ width: "100%", height: "100%", borderRadius: "4px" }}
              />
            </div>
            <div style={styles.barsContainer}>
              {/* HP Bar */}
              <div style={styles.barOuter}>
                <div
                  style={{
                    ...styles.barInner,
                    width: `${hpPercent}%`,
                    backgroundColor: "#10b981",
                  }}
                />
                <span style={styles.barText}>
                  {character?.hp ?? 100}/{character?.maxHp ?? 100}
                </span>
              </div>
              {/* Mana Bar */}
              <div style={styles.barOuter}>
                <div
                  style={{
                    ...styles.barInner,
                    width: `${manaPercent}%`,
                    backgroundColor: "#0284c7",
                  }}
                />
                <span style={styles.barText}>
                  {character?.mana ?? 50}/{character?.maxMana ?? 50}
                </span>
              </div>
            </div>
          </div>

          {/* Region Label (Right) */}
          <div style={styles.regionLabel}>
            Region: {formattedRegion} - {!activeBattle} - {isCampSite} -{" "}
            {character?.currentZone}
          </div>
        </div>

        {/* Central Menu Area */}
        <div style={styles.menuContainer}>
          {error && <p style={styles.errorText}>{error}</p>}

          {menuMode === "MAIN" ? (
            <div style={styles.buttonStack}>
              <button
                style={{
                  ...styles.menuButton,
                  ...(isNewBattleDisabled ? styles.disabledButton : {}),
                }}
                disabled={isNewBattleDisabled}
                onClick={handleBattleClick}
                title={
                  isNewBattleDisabled
                    ? "Cannot search for monsters in Camp Site"
                    : undefined
                }
              >
                {activeBattle ? "Resume battle" : "New Battle"}
              </button>

              <button
                style={styles.menuButton}
                onClick={() => setMenuMode("CHANGE_REGION")}
              >
                Change Region
              </button>
              <button
                style={{ ...styles.menuButton, ...styles.disabledButton }}
                disabled
              >
                Inventory
              </button>
              <button
                style={{ ...styles.menuButton, ...styles.disabledButton }}
                disabled
              >
                Vendor
              </button>
            </div>
          ) : (
            <div style={styles.regionGridContainer}>
              <h3 style={styles.subTitle}>Select Region</h3>
              <div style={styles.regionGrid}>
                {Zone.map((zone) => (
                  <button
                    key={zone}
                    style={{
                      ...styles.menuButton,
                      ...(character?.currentZone === zone
                        ? styles.activeZoneButton
                        : {}),
                    }}
                    onClick={() => handleZoneSelect(zone)}
                  >
                    {zone.replace("_", " ")}
                  </button>
                ))}
              </div>
              <button
                style={styles.backButton}
                onClick={() => setMenuMode("MAIN")}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100vh",
    backgroundColor: "#0a0a0a",
    // Fallback background image style matching dark forest
    backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600')`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    fontFamily: "monospace, sans-serif",
    color: "#ffffff",
  },
  gameFrame: {
    width: "90%",
    maxWidth: "900px",
    height: "520px",
    border: "3px solid #2563eb", // Blue wireframe border from image
    boxShadow: "0 0 15px rgba(37, 99, 235, 0.4)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "1.5rem",
    boxSizing: "border-box",
    position: "relative",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  characterBox: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    border: "2px solid #2563eb",
    padding: "0.5rem",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  avatar: {
    width: "48px",
    height: "48px",
    backgroundColor: "#334155",
    border: "1px solid #64748b",
  },
  barsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    width: "160px",
  },
  barOuter: {
    position: "relative",
    height: "18px",
    backgroundColor: "#1e293b",
    border: "1px solid #475569",
    overflow: "hidden",
  },
  barInner: {
    height: "100%",
    transition: "width 0.3s ease",
  },
  barText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    fontSize: "0.75rem",
    fontWeight: "bold",
    color: "#ffffff",
    textShadow: "1px 1px 2px #000",
  },
  regionLabel: {
    fontSize: "1.1rem",
    fontWeight: "bold",
    color: "#ffffff",
    textShadow: "1px 1px 3px #000",
    marginTop: "0.5rem",
  },
  menuContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  buttonStack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.8rem",
    width: "260px",
  },
  menuButton: {
    padding: "0.75rem 1rem",
    fontSize: "1rem",
    fontWeight: "bold",
    color: "#ffffff",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    border: "2px solid #2563eb",
    cursor: "pointer",
    textAlign: "center",
    transition: "all 0.2s ease",
  },
  activeZoneButton: {
    backgroundColor: "#2563eb",
    borderColor: "#60a5fa",
  },
  regionGridContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.75rem",
    width: "100%",
    maxWidth: "500px",
  },
  subTitle: {
    margin: 0,
    fontSize: "1.2rem",
  },
  regionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
    width: "100%",
  },
  backButton: {
    marginTop: "0.5rem",
    padding: "0.5rem 1.5rem",
    fontSize: "0.9rem",
    color: "#94a3b8",
    backgroundColor: "transparent",
    border: "1px solid #475569",
    cursor: "pointer",
  },
  errorText: {
    color: "#ef4444",
    marginBottom: "0.75rem",
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
    borderColor: "#4b5563",
    pointerEvents: "none", // Block all click/mouse events in CSS
  },
};
