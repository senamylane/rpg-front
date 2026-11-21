// src/components/SelectCharacterScreen.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { fetchAllCharacters } from "../api/characterApi";
import { type GameCharacter } from "../types/character";
import "./css/SelectCharacterScreen.css";

export const SelectCharacterScreen: React.FC = () => {
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<GameCharacter[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        const data = await fetchAllCharacters();
        setCharacters(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar personagens",
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCharacters();
  }, []);

  const handleSelectCharacter = (id: number) => {
    navigate(`/game/${id}`);
  };

  return (
    <div className="retro-scroll" style={styles.container}>
      <h1 style={styles.title}>Heros</h1>

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
          characters.map((char) => (
            <div
              key={char.id}
              className="hero-row"
              style={styles.heroRow}
              onClick={() => handleSelectCharacter(char.id)}
            >
              <div style={styles.avatarBox} />
              <span style={styles.heroText}>
                {char.name} - lvl {char.level || 1}
              </span>
            </div>
          ))
        )}
      </div>

      <button style={styles.backButton} onClick={() => navigate("/")}>
        Back
      </button>
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
    backgroundColor: "#121212", // Fundo cinza conforme a imagem
    fontFamily: "sans-serif",
    color: "white",
    padding: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: "1rem",
  },
  mainBox: {
    width: "100%",
    maxWidth: "500px",
    height: "450px", // Fixed height forces the list to scroll when it overflows
    overflowY: "auto", // Enables vertical scrolling
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
    transition: "transform 0.1s",
  },
  avatarBox: {
    width: "80px",
    height: "70px",
    border: "5px solid #000000",
    borderRadius: "8px",
    backgroundColor: "#888888", // Fundo vazio combinando
  },
  heroText: {
    fontSize: "1.5rem",
    fontWeight: "bold",
  },
  backButton: {
    marginTop: "2rem",
    padding: "1rem 4rem",
    fontSize: "1.5rem",
    fontWeight: "bold",
    backgroundColor: "#888888",
    color: "white",
    border: "6px solid #000000",
    cursor: "pointer",
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
