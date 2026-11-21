// src/components/MainScreen.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { fetchAllCharacters } from "../api/characterApi";

interface CharacterOption {
    id: number;
    name: string;
    classType?: string;
    level?: number;
}

export const MainScreen: React.FC = () => {
    const navigate = useNavigate();
    const [characters, setCharacters] = useState<CharacterOption[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Estado do fluxo de New Game (1 a 4 jogadores)
    const [isNewGameOpen, setIsNewGameOpen] = useState<boolean>(false);
    const [playerCount, setPlayerCount] = useState<number>(1);
    const [selectedHeroIds, setSelectedHeroIds] = useState<(number | null)[]>([
        null,
    ]);

    useEffect(() => {
        let isMounted = true;

        const checkSavedCharacters = async () => {
            try {
                setIsLoading(true);
                const data = await fetchAllCharacters();
                if (isMounted) {
                    setCharacters(data);
                    setError(null);
                }
            } catch (err) {
                if (isMounted) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Error connecting to server",
                    );
                    setCharacters([]);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        checkSavedCharacters();

        return () => {
            isMounted = false;
        };
    }, []);

    // Ajusta o tamanho do array de slots quando muda a quantidade de jogadores (1 a 4)
    useEffect(() => {
        setSelectedHeroIds((prev) =>
            Array.from(
                { length: playerCount },
                (_, index) => prev[index] ?? null,
            ),
        );
    }, [playerCount]);

    const handleOpenNewGame = () => {
        setError(null);
        setPlayerCount(1);
        setSelectedHeroIds([null]);
        setIsNewGameOpen(true);
    };

    const handleSlotChange = (slotIndex: number, rawValue: string) => {
        const parsedId = rawValue === "" ? null : Number(rawValue);
        setSelectedHeroIds((prev) => {
            const updated = [...prev];
            updated[slotIndex] = parsedId;
            return updated;
        });
    };

    const hasSavedCharacters = characters.length > 0;
    const allSlotsFilled = selectedHeroIds.every(
        (id): id is number => id !== null,
    );
    const uniqueSelectedCount = new Set(
        selectedHeroIds.filter((id): id is number => id !== null),
    ).size;
    const canStartBattle =
        allSlotsFilled &&
        uniqueSelectedCount === playerCount &&
        characters.length >= playerCount;

    const handleStartBattle = () => {
        if (!canStartBattle) return;
        const heroIds = selectedHeroIds.filter(
            (id): id is number => id !== null,
        );
        navigate(`/game/${heroIds.join(",")}`, {
            state: { heroIds, playerCount },
        });
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.title}>RPG Realm</h1>

            {error && <p style={styles.errorText}>{error}</p>}

            {!isNewGameOpen ? (
                <div style={styles.buttonContainer}>
                    <button
                        style={{
                            ...styles.button,
                            ...(!hasSavedCharacters || isLoading
                                ? styles.disabledButton
                                : {}),
                        }}
                        disabled={!hasSavedCharacters || isLoading}
                        onClick={handleOpenNewGame}
                    >
                        New Game
                    </button>

                    <button
                        style={{
                            ...styles.button,
                            ...(!hasSavedCharacters || isLoading
                                ? styles.disabledButton
                                : {}),
                        }}
                        disabled={!hasSavedCharacters || isLoading}
                        onClick={() => navigate("/character/select")}
                    >
                        {isLoading ? "Checking saves..." : "Load Game"}
                    </button>

                    <button
                        style={styles.button}
                        onClick={() => navigate("/character/new")}
                    >
                        Create Hero
                    </button>
                </div>
            ) : (
                <div style={styles.newGameBox}>
                    <div style={styles.fieldGroup}>
                        <label
                            htmlFor="player-count-select"
                            style={styles.label}
                        >
                            Players (1 - 4):
                        </label>
                        <select
                            id="player-count-select"
                            style={styles.select}
                            value={playerCount}
                            onChange={(e) =>
                                setPlayerCount(Number(e.target.value))
                            }
                        >
                            {[1, 2, 3, 4].map((count) => (
                                <option key={count} value={count}>
                                    {count} {count === 1 ? "Player" : "Players"}
                                </option>
                            ))}
                        </select>
                    </div>

                    {characters.length < playerCount && (
                        <p style={styles.errorText}>
                            You need at least {playerCount} heroes to start a{" "}
                            {playerCount}-player game.
                        </p>
                    )}

                    <div style={styles.slotsContainer}>
                        {selectedHeroIds.map((selectedId, slotIndex) => {
                            const takenByOtherSlots = new Set(
                                selectedHeroIds.filter(
                                    (id, idx) =>
                                        idx !== slotIndex && id !== null,
                                ),
                            );

                            return (
                                <div key={slotIndex} style={styles.fieldGroup}>
                                    <label
                                        htmlFor={`hero-slot-${slotIndex}`}
                                        style={styles.label}
                                    >
                                        Player {slotIndex + 1}:
                                    </label>
                                    <select
                                        id={`hero-slot-${slotIndex}`}
                                        style={styles.select}
                                        value={selectedId ?? ""}
                                        onChange={(e) =>
                                            handleSlotChange(
                                                slotIndex,
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="">
                                            -- Select Hero --
                                        </option>
                                        {characters.map((hero) => {
                                            const isTaken =
                                                takenByOtherSlots.has(hero.id);
                                            return (
                                                <option
                                                    key={hero.id}
                                                    value={hero.id}
                                                    disabled={isTaken}
                                                >
                                                    {hero.name}
                                                    {hero.classType
                                                        ? ` (${hero.classType})`
                                                        : ""}
                                                    {hero.level !== undefined
                                                        ? ` - Lvl ${hero.level}`
                                                        : ""}
                                                    {isTaken
                                                        ? " [Selected]"
                                                        : ""}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            );
                        })}
                    </div>

                    <div style={styles.actionsRow}>
                        <button
                            style={{
                                ...styles.button,
                                ...(!canStartBattle
                                    ? styles.disabledButton
                                    : {}),
                            }}
                            disabled={!canStartBattle}
                            onClick={handleStartBattle}
                        >
                            Start Game
                        </button>

                        <button
                            style={styles.secondaryButton}
                            onClick={() => setIsNewGameOpen(false)}
                        >
                            Back
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Inline styles for fast preview
const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#121212",
        color: "#ffffff",
        fontFamily: "sans-serif",
        padding: "1rem",
    },
    title: {
        fontSize: "3rem",
        marginBottom: "2rem",
        letterSpacing: "2px",
    },
    buttonContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "220px",
    },
    newGameBox: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "320px",
        maxWidth: "100%",
        backgroundColor: "#1e1e2e",
        padding: "1.5rem",
        borderRadius: "10px",
    },
    slotsContainer: {
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
    },
    fieldGroup: {
        display: "flex",
        flexDirection: "column",
        gap: "0.35rem",
    },
    label: {
        fontSize: "0.95rem",
        fontWeight: "bold",
    },
    select: {
        padding: "0.6rem",
        borderRadius: "6px",
        border: "1px solid #4b5563",
        backgroundColor: "#121212",
        color: "#ffffff",
        fontSize: "0.95rem",
    },
    actionsRow: {
        display: "flex",
        gap: "0.75rem",
        marginTop: "0.5rem",
    },
    button: {
        flex: 1,
        padding: "0.8rem 1.2rem",
        fontSize: "1rem",
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: "#4f46e5",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        transition: "background-color 0.2s ease",
    },
    secondaryButton: {
        padding: "0.8rem 1rem",
        fontSize: "1rem",
        fontWeight: "bold",
        color: "#ffffff",
        backgroundColor: "#374151",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
    },
    disabledButton: {
        backgroundColor: "#374151",
        color: "#9ca3af",
        cursor: "not-allowed",
    },
    errorText: {
        color: "#ef4444",
        marginBottom: "0.5rem",
        fontSize: "0.9rem",
    },
};
