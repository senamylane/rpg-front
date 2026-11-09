// src/components/BattleScreen.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  getBattleById,
  playerAttack,
  endBattle,
  enemyAttack,
  reviveCharacter,
  getSpellsByClass,
  useSpell,
  type BattleData,
  type BattlePlayer,
  type BattleEnemy,
  type SpellConfig,
} from "../api/battleApi";
import { takeBreath } from "../api/characterApi";
import "./css/BattleScreen.css";

export const BattleScreen: React.FC = () => {
  const navigate = useNavigate();
  const { battleId } = useParams<{ battleId: string }>();

  const [player, setPlayer] = useState<BattlePlayer | null>(null);
  const [enemies, setEnemies] = useState<BattleEnemy[]>([]);

  const [activeTurnName, setActiveTurnName] = useState<string>("Player");
  const [activeEntityId, setActiveEntityId] = useState<string>("PLAYER");
  const [isSelectingTarget, setIsSelectingTarget] = useState<boolean>(false);
  const [damagedEntity, setDamagedEntity] = useState<string | null>(null);

  const [showDeathModal, setShowDeathModal] = useState<boolean>(false);
  const [showFleeModal, setShowFleeModal] = useState<boolean>(false);
  const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);

  const [showSpellsMenu, setShowSpellsMenu] = useState<boolean>(false);
  const [selectedSpell, setSelectedSpell] = useState<SpellConfig | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
  const [availableSpells, setAvailableSpells] = useState<SpellConfig[]>([]);

  const isPlayerTurn = activeEntityId === "PLAYER";

  useEffect(() => {
    if (!battleId) return;

    const loadBattle = async () => {
      try {
        const data = await getBattleById(battleId);
        setPlayer(data.player);
        setEnemies(data.enemies);
        if (data.player && data.player.classType) {
          const loadSpells = async () => {
            try {
              const spells = await getSpellsByClass(data.player.classType);
              setAvailableSpells(spells);
            } catch (error) {
              console.error("Erro ao carregar magias", error);
            }
          };
          loadSpells();
        }
      } catch (error) {
        console.error(error);
      }
    };
    loadBattle();
  }, [battleId]);

  // Checa a Vitória (Todos os inimigos mortos)
  useEffect(() => {
    if (!battleId || !player) return;
    const allEnemiesDead =
      enemies.length > 0 && enemies.every((e) => e.hp <= 0);

    if (allEnemiesDead) {
      setShowVictoryModal(true); // Exibe o modal em vez de redirecionar na hora
    }
  }, [enemies, battleId, player]);

  // Checa a Derrota (Player HP <= 0)
  useEffect(() => {
    if (player && player.hp <= 0) {
      setShowDeathModal(true);
    }
  }, [player]);

  const processEnemyTurns = async (
    currentEnemies: BattleEnemy[],
    currentPlayer: BattlePlayer,
  ) => {
    if (!battleId) return;
    let currentPlayerState = { ...currentPlayer };

    for (const enemy of currentEnemies) {
      if (enemy.hp <= 0) continue;
      if (currentPlayerState.hp <= 0) break;

      // Controle visual da UI (Usa o UUID enemy_id)
      setActiveTurnName(enemy.name);
      setActiveEntityId(enemy.enemy_id);

      await new Promise((res) => setTimeout(res, 1000));

      try {
        // Chamada real ao backend (Usa a coluna ID numérica "enemy.id")
        const updatedPlayer = await enemyAttack(
          battleId,
          enemy.enemy_id,
          currentPlayerState.id,
        );
        currentPlayerState = updatedPlayer;

        setPlayer(currentPlayerState);
        setDamagedEntity("PLAYER");
        setTimeout(() => setDamagedEntity(null), 300);
      } catch (err) {
        console.error("Erro ao processar turno do inimigo", err);
      }

      await new Promise((res) => setTimeout(res, 500));
    }

    if (currentPlayerState.hp > 0) {
      setActiveTurnName("Player");
      setActiveEntityId("PLAYER");
    }
  };

  const handlePlayerAttackClick = () => {
    if (isPlayerTurn) setIsSelectingTarget(!isSelectingTarget);
  };

  const handleTakeBreath = async () => {
    if (!isPlayerTurn || !player) return;
    const updatedPlayer = await takeBreath(player.id);
    setPlayer(updatedPlayer);
    processEnemyTurns(enemies, player);
  };

  const handleVictoryContinue = async () => {
    if (!player || !battleId) return;

    try {
      // Encerra a batalha no backend apenas quando o jogador clica em Continuar
      await endBattle(battleId);
      navigate(`/game/${player.id}`);
    } catch (error) {
      console.error("Erro ao encerrar batalha após vitória", error);
    }
  };

  const handleEnemySelect = async (targetEnemy: BattleEnemy) => {
    if (
      !isPlayerTurn ||
      !battleId ||
      !player ||
      targetEnemy.hp <= 0 ||
      (showSpellsMenu && !selectedSpell)
    )
      return;

    if (selectedSpell) {
      console.log("Selecting " + targetEnemy.enemy_id);

      if (
        selectedTargets.length < selectedSpell.numTargets &&
        !selectedTargets.includes(targetEnemy.enemy_id)
      ) {
        console.log("Adding " + targetEnemy.enemy_id);
        setSelectedTargets((prev) => [...prev, targetEnemy.enemy_id]);
      }

      return; // Importante: O return para a execução aqui na magia!
    }
    if (!isSelectingTarget) return;
    setIsSelectingTarget(false);

    try {
      // 1. Chama a API para registrar o ataque
      const updatedEnemy = await playerAttack(
        battleId,
        player.id,
        targetEnemy.enemy_id,
      );

      // 2. Atualiza os inimigos localmente para refletir o HP reduzido
      const updatedEnemies = enemies.map((e) =>
        e.enemy_id === targetEnemy.enemy_id ? updatedEnemy : e,
      );
      setEnemies(updatedEnemies);

      // 3. Aplica o flash vermelho de dano
      setDamagedEntity(targetEnemy.enemy_id);
      setTimeout(() => setDamagedEntity(null), 300);

      // 4. A MAGIA ACONTECE AQUI:
      // Congela a execução desta função por 1 segundo (1000ms)
      // Isso dá tempo para a barra de HP descer (0.4s no CSS) e o player ver o que aconteceu
      await new Promise((res) => setTimeout(res, 1000));

      // 5. Só agora, após o "respiro", os inimigos começam a agir
      await processEnemyTurns(updatedEnemies, player);
    } catch (error) {
      console.error(error);
      setIsSelectingTarget(false);
    }
  };

  const handleFlee = async () => {
    if (!isPlayerTurn || !battleId || !player) return;

    const aliveEnemies = enemies.filter((e) => e.hp > 0);
    const totalLevel = aliveEnemies.reduce((acc, e) => acc + e.level, 0);
    const chance = Math.max(10, 80 - totalLevel * 5);

    const roll = Math.random() * 100;
    if (roll <= chance) {
      await endBattle(battleId);
      navigate(`/game/${player.id}`);
    } else {
      setShowFleeModal(true);
    }
  };

  const handleConfirmSpell = async () => {
    // 1. Validação de segurança: garante que tudo está preenchido
    if (!selectedSpell || selectedTargets.length === 0 || !battleId || !player)
      return;

    // 2. Guarda a referência da magia e fecha os menus instantaneamente
    const spellBeingCast = selectedSpell;
    setSelectedSpell(null);
    setShowSpellsMenu(false);

    try {
      // 3. Faz o POST para o backend enviando o array de alvos
      const updatedAffectedEnemies = await useSpell({
        battle_id: battleId,
        character_id: player.id,
        targets: selectedTargets,
        spell: spellBeingCast.id,
      });

      player.mana -= spellBeingCast.manaCost;
      setPlayer(player);

      // 4. Atualiza o HP/Status dos inimigos na UI fazendo merge com a resposta do backend
      let newEnemiesState = [...enemies];
      updatedAffectedEnemies.forEach((affected) => {
        newEnemiesState = newEnemiesState.map((e) =>
          e.enemy_id === affected.enemy_id ? affected : e,
        );
      });
      setEnemies(newEnemiesState);

      // 5. Limpa a lista de alvos do front
      setSelectedTargets([]);

      // 6. Dá uma pausa de 1 segundo (para o jogador ver o dano) e passa o turno aos inimigos
      await new Promise((res) => setTimeout(res, 1000));
      await processEnemyTurns(newEnemiesState, player);
    } catch (error) {
      console.error("Erro ao conjurar magia:", error);
      setSelectedTargets([]); // Zera os targets caso dê erro, para não travar a tela
    }
  };

  const handleCloseFleeModal = async () => {
    setShowFleeModal(false);
    if (player) {
      await processEnemyTurns(enemies, player);
    }
  };

  const handleRevive = async () => {
    if (!player) return;

    try {
      // 1. Chama endpoint de reviver o personagem
      await reviveCharacter(player.id);

      // 2. Encerra a batalha no servidor se necessário
      if (battleId) {
        await endBattle(battleId).catch(console.error);
      }

      // 3. Redireciona de volta
      navigate(`/game/${player.id}`);
    } catch (err) {
      console.error("Erro ao reviver personagem", err);
    }
  };

  if (!player)
    return (
      <div style={{ color: "black", textAlign: "center", marginTop: "20%" }}>
        Loading Battle...
      </div>
    );

  return (
    <div className="battle-container">
      {/* MODAIS */}
      {showDeathModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <span style={styles.modalText}>Você morreu!</span>
            <button style={styles.actionButton} onClick={handleRevive}>
              Reviver
            </button>
          </div>
        </div>
      )}

      {showFleeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <span style={styles.modalText}>Flee attempt failed</span>
            <button style={styles.actionButton} onClick={handleCloseFleeModal}>
              OK
            </button>
          </div>
        </div>
      )}
      {showVictoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <span style={{ ...styles.modalText, color: "#10b981" }}>
              Vitória!
            </span>
            <span style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              Todos os inimigos foram derrotados.
            </span>
            <button style={styles.actionButton} onClick={handleVictoryContinue}>
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* RESTANTE DA TELA (idêntico à versão anterior) */}
      <div style={styles.headerArea}>
        <div style={styles.turnIndicator}>
          Turn: {activeEntityId === "PLAYER" ? "Player" : "Enemy"}
        </div>
      </div>


      <div style={styles.battleArena}>
        <div style={styles.playerSide}>
          <div style={styles.characterName}>
            {player.name}
            {activeEntityId === "PLAYER" && player.hp > 0 && (
              <span className="attacking-icon">⚔️</span>
            )}
          </div>
          <div
            className={`
      card-animated
      ${damagedEntity === "PLAYER" ? "card-damaged" : ""}
      ${activeEntityId === "PLAYER" && player.hp > 0 ? "card-active-player" : ""}
      ${activeEntityId !== "PLAYER" ? "card-dimmed" : ""} 
    `}
            style={styles.card} // Mantém apenas os estilos base de tamanho e layout
          >
            <div style={styles.avatarPlaceholder} />
            <div style={styles.barsContainer}>
              <div style={styles.barOuter}>
                <div
                  className="hp-bar-inner"
                  style={{
                    width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%`,
                  }}
                />
                <span style={styles.barText}>
                  {Math.max(0, player.hp)}/{player.maxHp}
                </span>
              </div>
              <div style={styles.barOuter}>
                <div
                  className="mana-bar-inner"
                  style={{ width: `${(player.mana / player.maxMana) * 100}%` }}
                />
                <span style={styles.barText}>
                  {player.mana}/{player.maxMana}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.centerAction}>
          {isSelectingTarget && (
            <div style={styles.selectTargetText}>
              Select an enemy
              <br />
              to attack
            </div>
          )}
        </div>
        {/*Enemy cards*/}
        <div style={styles.enemySide}>
          {enemies.map((enemy) => {
            const isThisEnemyActive = activeEntityId === enemy.enemy_id;
            const isSomeoneElseAttacking =
              activeEntityId !== "PLAYER" && !isThisEnemyActive;
            const isSelectedForSpell = selectedTargets.includes(enemy.enemy_id); // Verifica se está selecionado

            return (
              <div key={enemy.enemy_id} style={styles.enemyWrapper}>
                <div style={styles.characterName}>
                  {enemy.name}
                  {isThisEnemyActive && enemy.hp > 0 && (
                    <span className="attacking-icon">⚔️</span>
                  )}
                </div>
                <div
                  onClick={() => handleEnemySelect(enemy)}
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
          })}
        </div>
      </div>


      <div style={styles.actionMenu}>
        {selectedSpell ? (
          // ---- MODO 3: CONFIRMAR ALVOS DA MAGIA ----
          <>
            <button
              style={{
                ...styles.actionButton,
                ...(selectedTargets.length === 0 ? styles.disabledButton : {}),
              }}
              disabled={selectedTargets.length === 0}
              onClick={handleConfirmSpell} // A função que dispara a magia
            >
              Cast {selectedSpell.name}
            </button>
            <button
              style={styles.actionButton}
              onClick={() => {
                setSelectedSpell(null);
                setSelectedTargets([]);
              }}
            >
              Cancel
            </button>
          </>
        ) : showSpellsMenu ? (
          // ---- MODO 2: LISTA DE MAGIAS (Vindas do Backend) ----
          <>
            {availableSpells.length === 0 && (
              <span style={{ color: "black", alignSelf: "center" }}>
                No spells found.
              </span>
            )}

            {availableSpells.map((spell) => (
              <button
                key={spell.id}
                style={{
                  ...styles.actionButton,
                  ...(player.mana < spell.manaCost
                    ? styles.disabledButton
                    : {}),
                }}
                disabled={player.mana < spell.manaCost}
                onClick={() => {
                  setSelectedSpell(spell); // Seleciona a magia
                  setSelectedTargets([]); // Zera os alvos anteriores, preparando para a seleção
                  setIsSelectingTarget(true);
                }}
              >
                {spell.name} ({spell.manaCost} MP)
              </button>
            ))}
            <button
              style={styles.actionButton}
              onClick={() => setShowSpellsMenu(false)}
            >
              Back
            </button>
          </>
        ) : (
          // ---- MODO 1: MENU NORMAL ----
          <>
            <button
              style={{
                ...styles.actionButton,
                ...(!isPlayerTurn || showDeathModal || showVictoryModal
                  ? styles.disabledButton
                  : {}),
              }}
              disabled={!isPlayerTurn || showDeathModal || showVictoryModal}
              onClick={() => {
                handlePlayerAttackClick();
                setSelectedSpell(null);
              }}
            >
              Attack
            </button>
            <button
              style={{
                ...styles.actionButton,
                ...(!isPlayerTurn || isSelectingTarget
                  ? styles.disabledButton
                  : {}),
              }}
              disabled={!isPlayerTurn || isSelectingTarget}
              onClick={() => {
                setShowSpellsMenu(true);
                setIsSelectingTarget(false);
              }}
            >
              Use Spell
            </button>
            <button
              style={{
                ...styles.actionButton,
                ...(!isPlayerTurn ||
                showDeathModal ||
                showVictoryModal ||
                isSelectingTarget
                  ? styles.disabledButton
                  : {}),
              }}
              disabled={
                !isPlayerTurn ||
                showDeathModal ||
                showVictoryModal ||
                isSelectingTarget
              }
              onClick={() => {
                handleTakeBreath();
              }}
            >
              Take Breath
            </button>
            <button
              style={{ ...styles.actionButton, ...styles.disabledButton }}
              disabled
            >
              Use Item
            </button>
            <button
              style={{
                ...styles.actionButton,
                ...(!isPlayerTurn ||
                showDeathModal ||
                showVictoryModal ||
                isSelectingTarget
                  ? styles.disabledButton
                  : {}),
              }}
              disabled={
                !isPlayerTurn ||
                showDeathModal ||
                showVictoryModal ||
                isSelectingTarget
              }
              onClick={handleFlee}
            >
              Flee
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// Objeto styles permanece o mesmo da resposta anterior...
const styles: Record<string, React.CSSProperties> = {
  // battleContainer: {
  //   position: "relative",
  //   width: "100vw",
  //   height: "100vh",
  //   backgroundImage:
  //     'linear-gradient(rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.85)), url("https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1920&auto=format&fit=crop")',
  //   backgroundSize: "cover",
  //   backgroundPosition: "center",
  //   display: "flex",
  //   flexDirection: "column",
  //   justifyContent: "space-between", // Empurra o topo para cima e o menu para baixo
  //   padding: "30px 50px",
  //   overflow: "hidden",
  //   fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  // },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    border: "5px solid #000000",
    padding: "3rem",
    display: "flex",
    flexDirection: "column",
    gap: "2rem",
    alignItems: "center",
    boxShadow: "0px 0px 20px rgba(0,0,0,0.5)",
  },
  modalText: {
    fontSize: "2rem",
    fontWeight: "bold",
    color: "#000000",
  },
  headerArea: {
    display: "flex",
    justifyContent: "center", // Deixa o turno centralizado no topo
    alignItems: "center",
    width: "100%",
  },
  turnIndicator: {
    fontSize: "1.5rem",
    fontWeight: "bold",
    color: "#f8fafc",
    textTransform: "uppercase",
    letterSpacing: "2px",
    background: "rgba(15, 23, 42, 0.8)",
    padding: "8px 24px",
    borderRadius: "20px",
    border: "1px solid #475569",
    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
  },
  battlefieldArea: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between", // Jogador na esquerda, Inimigos na direita
    alignItems: "center",
    width: "100%",
    flex: 1,
    padding: "0 40px",
  },
  heroesSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
  },

  enemiesSection: {
    display: "flex",
    flexDirection: "row",
    gap: "20px",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  battleArena: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexGrow: 1,
    marginBottom: "1rem",
  },
  playerSide: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "30%",
  },
  centerAction: {
    width: "30%",
    textAlign: "center",
  },
  selectTargetText: {
    fontSize: "1.2rem",
    fontWeight: "bold",
  },
  enemySide: {
    display: "flex",
    flexDirection: "column",
    gap: "1.2rem",
    width: "30%",
    alignItems: "center",
  },
  enemyWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  characterName: {
    fontSize: "1.2rem",
    fontWeight: "bold",
    marginBottom: "0.3rem",
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
  },
  cardActive: {
    borderColor: "#3b82f6",
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
  divider: {
    borderTop: "6px solid #000000",
    width: "100%",
    margin: "1.5rem 0",
  },
  actionMenu: {
    bottom: "30px",
    display: "flex",
    justifyContent: "center",
    flexDirection: "row", // GARANTE QUE OS BOTÕES FICAM LADO A LADO
    gap: "15px",
    zIndex: 10,
    paddingBottom: "16px"
  },
  actionButton: {
    background: "linear-gradient(to bottom, #2d3748, #1a202c)",
    color: "#f8fafc",
    border: "2px solid #64748b",
    borderRadius: "8px",
    padding: "12px 24px",
    fontSize: "1rem",
    fontWeight: 700,
    textTransform: "uppercase",
    cursor: "pointer",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.4)",
    transition: "all 0.2s ease-in-out",
    minWidth: "130px", // Evita que fiquem deformados
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
};
