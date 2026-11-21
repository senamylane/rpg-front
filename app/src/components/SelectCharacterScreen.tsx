// src/components/SelectCharacterScreen.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { fetchAllCharacters } from "../api/characterApi";
import { type GameCharacter } from "../types/character";
import "./css/SelectCharacterScreen.css";

const MAX_PARTY_SIZE = 4;

export const SelectCharacterScreen: React.FC = () => {
    const navigate = useNavigate();
    const [characters, setCharacters] = useState<GameCharacter[]>([]);
    const [partySize, setPartySize] = useState<number>(1);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCharacters = async () => {
            try {
                const data = await fetchAllCharacters();
                setCharacters(data);
            } catch (err) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Erro ao carregar personagens",
                );
            } finally {
                setIsLoading(false);
            }
        };

        fetchCharacters();
    }, []);

    // Trim extra selections if user lowers partySize
    useEffect(() => {
        setSelectedIds((prev) => prev.slice(0, partySize));
    }, [partySize]);

    const startGameWithIds = (ids: number[]) => {
        if (ids.length < 1 || ids.length > MAX_PARTY_SIZE) return;
        navigate(`/game/${ids.join(",")}`, {
            state: { heroIds: ids, playerCount: ids.length },
        });
    };

    const handleToggleCharacter = (id: number) => {
        if (partySize === 1) {
            startGameWithIds([id]);
            return;
        }

        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter((item) => item !== id);
            }
            if (prev.length >= partySize) {
                return prev;
            }
            return [...prev, id];
        });
    };

    const canStartParty =
        selectedIds.length === partySize &&
        new Set(selectedIds).size === partySize &&
        partySize >= 1 &&
        partySize <= MAX_PARTY_SIZE;

    return (
        <div className="retro-scroll" style={styles.container}>
            <h1 style={styles.title}>Load Party (1–4)</h1>

            <div style={styles.partyControls}>
                <label htmlFor="load-party-size" style={styles.partyLabel}>
                    Players:
                </label>
                <select
                    id="load-party-size"
                    value={partySize}
                    onChange={(e) => {
                        setPartySize(Number(e.target.value));
                        setSelectedIds([]);
                    }}
                    style={styles.partySelect}
                >
                    {[1, 2, 3, 4].map((n) => (
                        <option key={n} value={n}>
                            {n} {n === 1 ? "Hero" : "Heroes"}
                        </option>
                    ))}
                </select>

                {partySize > 1 && (
                    <span style={styles.partyCounter}>
                        Selected: {selectedIds.length}/{partySize}
                    </span>
                )}
            </div>

            <div style={styles.mainBox}>
                {isLoading ? (
                    <p style={styles.message}>Loading...</p>
                ) : error ? (
                    <p style={styles.error}>{error}</p>
                ) : characters.length === 0 ? (
                    <p style={styles.message}>
                        No characters found. Go back and create one!
                    </p>
                ) : (
                    characters.map((char) => {
                        const slotIndex = selectedIds.indexOf(char.id);
                        const isSelected = slotIndex !== -1;
                        const isMaxReached =
                            partySize > 1 &&
                            !isSelected &&
                            selectedIds.length >= partySize;

                        return (
                            <div
                                key={char.id}
                                className="hero-row"
                                style={{
                                    ...styles.heroRow,
                                    ...(isSelected
                                        ? styles.heroRowSelected
                                        : {}),
                                    ...(isMaxReached
                                        ? styles.heroRowDisabled
                                        : {}),
                                }}
                                onClick={() =>
                                    !isMaxReached &&
                                    handleToggleCharacter(char.id)
                                }
                            >
                                <div style={styles.avatarBox} />
                                <span style={styles.heroText}>
                                    {char.name} - lvl {char.level || 1}
                                    {partySize > 1 && isSelected
                                        ? ` [P${slotIndex + 1}]`
                                        : ""}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            <div style={styles.actionsRow}>
                {partySize > 1 && (
                    <button
                        style={{
                            ...styles.startButton,
                            ...(!canStartParty ? styles.disabledButton : {}),
                        }}
                        disabled={!canStartParty}
                        onClick={() => startGameWithIds(selectedIds)}
                    >
                        Start ({selectedIds.length}/{partySize})
                    </button>
                )}

                <button style={styles.backButton} onClick={() => navigate("/")}>
                    Back
                </button>
            </div>
        </div>
    );
};

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        backgroundColor: "#121212",
        fontFamily: "sans-serif",
        color: "white",
        padding: "2rem",
    },
    title: {
        fontSize: "2rem",
        fontWeight: "bold",
        marginBottom: "1rem",
    },
    partyControls: {
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        marginBottom: "1rem",
    },
    partyLabel: {
        fontSize: "1.1rem",
        fontWeight: "bold",
    },
    partySelect: {
        padding: "0.4rem 0.8rem",
        fontSize: "1rem",
        backgroundColor: "#222",
        color: "white",
        border: "3px solid #888",
        borderRadius: "6px",
    },
    partyCounter: {
        fontSize: "1rem",
        color: "#93c5fd",
        fontWeight: "bold",
    },
    mainBox: {
        width: "100%",
        maxWidth: "500px",
        height: "450px",
        overflowY: "auto",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
        border: "6px solid #888",
        borderRadius: "24px",
        backgroundColor: "#444",
    },
    heroRow: {
        display: "flex",
        alignItems: "center",
        gap: "1.5rem",
        cursor: "pointer",
        padding: "0.5rem",
        borderRadius: "10px",
        border: "3px solid transparent",
        transition: "transform 0.1s",
    },
    heroRowSelected: {
        borderColor: "#3b82f6",
        backgroundColor: "#374151",
    },
    heroRowDisabled: {
        opacity: 0.45,
        cursor: "not-allowed",
    },
    avatarBox: {
        width: "80px",
        height: "70px",
        border: "5px solid #000000",
        borderRadius: "8px",
        backgroundColor: "#888888",
        flexShrink: 0,
    },
    heroText: {
        fontSize: "1.5rem",
        fontWeight: "bold",
    },
    actionsRow: {
        display: "flex",
        gap: "1rem",
        marginTop: "2rem",
    },
    startButton: {
        padding: "1rem 2.5rem",
        fontSize: "1.3rem",
        fontWeight: "bold",
        backgroundColor: "#2563eb",
        color: "white",
        border: "6px solid #000000",
        cursor: "pointer",
    },
    backButton: {
        padding: "1rem 4rem",
        fontSize: "1.5rem",
        fontWeight: "bold",
        backgroundColor: "#888888",
        color: "white",
        border: "6px solid #000000",
        cursor: "pointer",
    },
    disabledButton: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
    message: {
        fontSize: "1.2rem",
        fontWeight: "bold",
        textAlign: "center",
        marginTop: "2rem",
    },
    error: {
        fontSize: "1.2rem",
        fontWeight: "bold",
        color: "#7f1d1d",
        textAlign: "center",
        marginTop: "2rem",
    },
};
