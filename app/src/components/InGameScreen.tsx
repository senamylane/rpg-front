// src/components/InGameScreen.tsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router";
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
    heroIds?: number[];
    playerCount?: number;
    characters?: GameCharacter[];
}

export const InGameScreen: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { characterId } = useParams<{ characterId: string }>();

    const state = (location.state as LocationState | null) ?? null;

    // Supports comma-separated route param ("1,2,3"), single numeric param ("1"), or location.state.heroIds
    const resolvedHeroIds: number[] = React.useMemo(() => {
        if (state?.heroIds && state.heroIds.length > 0) {
            return state.heroIds.slice(0, 4);
        }
        if (characterId) {
            const parsedList = characterId
                .split(",")
                .map((s) => Number(s.trim()))
                .filter((n) => Number.isFinite(n) && n > 0);
            if (parsedList.length > 0) {
                return parsedList.slice(0, 4);
            }
        }
        return [];
    }, [characterId, state?.heroIds]);

    const [heroes, setHeroes] = useState<GameCharacter[]>(
        state?.characters ?? [],
    );
    const [activeBattle, setActiveBattle] = useState<Battle | null>(null);
    const [menuMode, setMenuMode] = useState<MenuMode>("MAIN");
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isStartingBattle, setIsStartingBattle] = useState<boolean>(false);

    useEffect(() => {
        if (resolvedHeroIds.length === 0) {
            setIsLoading(false);
            return;
        }

        let isMounted = true;

        const loadGameData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const loadedHeroes = await Promise.all(
                    resolvedHeroIds.map((id) => fetchCharacterById(id)),
                );

                let battleData: Battle | null = null;
                try {
                    battleData = await fetchActiveBattle(loadedHeroes[0].id);
                } catch {
                    battleData = null;
                }

                if (isMounted) {
                    setHeroes(loadedHeroes);
                    setActiveBattle(battleData);
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Error loading party data",
                    );
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadGameData();

        return () => {
            isMounted = false;
        };
    }, [resolvedHeroIds]);

    const leadHero = heroes[0] ?? null;
    const isCampSite = leadHero?.currentZone === "CAMP_SITE";
    const isNewBattleDisabled = !activeBattle && isCampSite;

    const handleBattleClick = async () => {
        if (isNewBattleDisabled || resolvedHeroIds.length === 0) return;

        setIsStartingBattle(true);
        setError(null);

        try {
            if (activeBattle) {
                navigate(`/battle/${activeBattle.id}`, {
                    state: { heroIds: resolvedHeroIds, heroes },
                });
            } else {
                const newBattle = await initBattle(resolvedHeroIds);
                navigate(`/battle/${newBattle.id}`, {
                    state: { heroIds: resolvedHeroIds, heroes },
                });
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to start battle",
            );
            setIsStartingBattle(false);
        }
    };

    const handleZoneSelect = async (zone: ZoneType) => {
        if (heroes.length === 0) return;

        try {
            setError(null);
            const results = await Promise.all(
                heroes.map((hero) => changeCharacterZone(hero.id, zone)),
            );

            if (results.every(Boolean)) {
                setHeroes((prev) =>
                    prev.map((hero) => ({ ...hero, currentZone: zone })),
                );
                setMenuMode("MAIN");
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Erro ao alterar região",
            );
        }
    };

    if (isLoading) {
        return <div style={styles.container}>Loading party...</div>;
    }

    const formattedRegion = leadHero?.currentZone
        ? leadHero.currentZone
              .replace(/_/g, " ")
              .toLowerCase()
              .replace(/\b\w/g, (l) => l.toUpperCase())
        : "Camp Site";

    return (
        <div style={styles.container}>
            <div style={styles.gameFrame}>
                {/* Top Header Section */}
                <div style={styles.header}>
                    {/* Region Label (Right) */}
                    <div style={styles.regionLabel}>
                        Party ({heroes.length}/4) | Region: {formattedRegion}
                    </div>
                    {/* Party Status Grid (1 to 4 Heroes) */}
                    <div style={styles.partyGrid}>
                        {heroes.map((hero, index) => {
                            const hpPercent = Math.max(
                                0,
                                Math.min(
                                    100,
                                    (hero.hp / Math.max(1, hero.maxHp)) * 100,
                                ),
                            );
                            const manaPercent = Math.max(
                                0,
                                Math.min(
                                    100,
                                    (hero.mana / Math.max(1, hero.maxMana)) *
                                        100,
                                ),
                            );
                            const expPercent = Math.max(
                                0,
                                Math.min(
                                    100,
                                    (hero.experience /
                                        Math.max(1, hero.nextLevelExperience)) *
                                        100,
                                ),
                            );

                            return (
                                <div key={hero.id} style={styles.characterBox}>
                                    <div style={styles.avatar}>
                                        <img
                                            src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
                                                hero.name || `hero-${index}`,
                                            )}`}
                                            alt={hero.name}
                                            style={{
                                                width: "100%",
                                                height: "100%",
                                                borderRadius: "4px",
                                            }}
                                        />
                                    </div>

                                    <div style={styles.heroDetails}>
                                        <div style={styles.heroNameRow}>
                                            <span style={styles.heroName}>
                                                {hero.name}
                                            </span>
                                            <span style={styles.heroLvl}>
                                                Lvl {hero.level}
                                            </span>
                                        </div>

                                        <div style={styles.barsContainer}>
                                            {/* HP Bar */}
                                            <div style={styles.barOuter}>
                                                <div
                                                    style={{
                                                        ...styles.barInner,
                                                        width: `${hpPercent}%`,
                                                        backgroundColor:
                                                            "#10b981",
                                                    }}
                                                />
                                                <div
                                                    style={
                                                        styles.barTextContainer
                                                    }
                                                >
                                                    <span
                                                        style={styles.barText}
                                                    >
                                                        {hero.hp}/{hero.maxHp}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Mana Bar */}
                                            <div style={styles.barOuter}>
                                                <div
                                                    style={{
                                                        ...styles.barInner,
                                                        width: `${manaPercent}%`,
                                                        backgroundColor:
                                                            "#0284c7",
                                                    }}
                                                />
                                                <div
                                                    style={
                                                        styles.barTextContainer
                                                    }
                                                >
                                                    <span
                                                        style={styles.barText}
                                                    >
                                                        {hero.mana}/
                                                        {hero.maxMana}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Exp Bar */}
                                            <div style={styles.barOuter}>
                                                <div
                                                    style={{
                                                        ...styles.xpBarInner,
                                                        width: `${expPercent}%`,
                                                    }}
                                                />
                                                <div
                                                    style={
                                                        styles.barTextContainer
                                                    }
                                                >
                                                    <span
                                                        style={styles.barText}
                                                    >
                                                        XP {hero.experience}/
                                                        {
                                                            hero.nextLevelExperience
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
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
                                    ...(isNewBattleDisabled || isStartingBattle
                                        ? styles.disabledButton
                                        : {}),
                                }}
                                onClick={handleBattleClick}
                                disabled={
                                    isNewBattleDisabled || isStartingBattle
                                }
                            >
                                {isStartingBattle ? "Loading..." : "New Battle"}
                            </button>

                            <button
                                style={styles.menuButton}
                                onClick={() => setMenuMode("CHANGE_REGION")}
                            >
                                Change Region
                            </button>
                            <button
                                style={{
                                    ...styles.menuButton,
                                    ...styles.disabledButton,
                                }}
                                disabled
                            >
                                Inventory
                            </button>
                            <button
                                style={{
                                    ...styles.menuButton,
                                    ...styles.disabledButton,
                                }}
                                disabled
                            >
                                Vendor
                            </button>
                            <button
                                style={{
                                    ...styles.menuButton,
                                }}
                                onClick={() => navigate("/")}
                            >
                                Exit
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
                                            ...(leadHero?.currentZone === zone
                                                ? styles.activeZoneButton
                                                : {}),
                                        }}
                                        onClick={() => handleZoneSelect(zone)}
                                    >
                                        {zone.replace(/_/g, " ")}
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
        backgroundImage: `linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)), url('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1600')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "monospace, sans-serif",
        color: "#ffffff",
        padding: "1rem",
        boxSizing: "border-box",
    },
    gameFrame: {
        width: "auto",
        maxWidth: "80%",
        minWidth: "50%",
        flex: 1,
        minHeight: "560px",
        border: "3px solid #2563eb",
        boxShadow: "0 0 15px rgba(37, 99, 235, 0.4)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "1.5rem",
        padding: "1.5rem",
        boxSizing: "border-box",
        position: "relative",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "1rem",
        flexWrap: "wrap",
        flexDirection: "column",
    },
    partyGrid: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.75rem",
        flex: 1,
        flexDirection: "row",
        minWidth: "75%",
        // flexWrap: "wrap",
        // backgroundColor: "white",
    },
    characterBox: {
        display: "flex",
        alignItems: "center",
        gap: "0.6rem",
        border: "2px solid #2563eb",
        padding: "0.5rem",
        backgroundColor: "rgba(0,0,0,0.65)",
        flexWrap: "wrap",
        maxWidth: "25%",
        minWidth: "20%",
        flex: 1,
    },
    avatar: {
        width: "48px",
        height: "48px",
        flexShrink: 0,
        backgroundColor: "#334155",
        border: "1px solid #64748b",
    },
    heroDetails: {
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
        flex: 1,
        minWidth: 0,
    },
    heroNameRow: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.85rem",
        fontWeight: "bold",
    },
    heroName: {
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
    },
    heroLvl: {
        color: "#93c5fd",
        marginLeft: "0.4rem",
        flexShrink: 0,
    },
    barsContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
        width: "100%",
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
        position: "relative",
        fontSize: "0.72rem",
        fontWeight: "bold",
        color: "#ffffff",
        textShadow: "1px 1px 2px #000",
        zIndex: 1,
    },
    barTextContainer: {
        position: "absolute",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    regionLabel: {
        fontSize: "1rem",
        fontWeight: "bold",
        color: "#ffffff",
        textShadow: "1px 1px 3px #000",
        marginTop: "0.25rem",
        textAlign: "right",
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
        pointerEvents: "none",
    },
    xpBarInner: {
        height: "100%",
        backgroundColor: "#eab308",
        transition: "width 0.4s ease-in-out",
    },
};
