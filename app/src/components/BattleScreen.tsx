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
import { EnemyCard } from "./battle-screen/enemyCard";

export const BattleScreen: React.FC = () => {
    const navigate = useNavigate();
    const { battleId } = useParams<{ battleId: string }>();

    const [players, setPlayers] = useState<BattlePlayer[]>([]);
    const [activeHeroIndex, setActiveHeroIndex] = useState<number>(0);
    const [enemies, setEnemies] = useState<BattleEnemy[]>([]);

    const [activeTurnName, setActiveTurnName] = useState<string>("Player");
    const [activeEntityId, setActiveEntityId] = useState<string>("PLAYER");
    const [isSelectingTarget, setIsSelectingTarget] = useState<boolean>(false);
    const [damagedEntity, setDamagedEntity] = useState<string | null>(null);

    const [showDeathModal, setShowDeathModal] = useState<boolean>(false);
    const [showFleeModal, setShowFleeModal] = useState<boolean>(false);
    const [showVictoryModal, setShowVictoryModal] = useState<boolean>(false);
    const [breathingEntity, setBreathingEntity] = useState<string | null>(null);
    const [showSpellsMenu, setShowSpellsMenu] = useState<boolean>(false);
    const [selectedSpell, setSelectedSpell] = useState<SpellConfig | null>(
        null,
    );
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [availableSpells, setAvailableSpells] = useState<SpellConfig[]>([]);
    const [popups, setPopups] = useState<FloatingPopup[]>([]);
    const [lungingEntity, setLungingEntity] = useState<string | null>(null);

    const spawnPopup = (
        targetKey: string,
        text: string,
        variant: FloatingPopup["variant"] = "damage",
    ) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        setPopups((prev) => [...prev, { id, targetKey, text, variant }]);
        setTimeout(() => {
            setPopups((prev) => prev.filter((item) => item.id !== id));
        }, 950);
    };

    const triggerLunge = (entityKey: string) => {
        setLungingEntity(entityKey);
        setTimeout(() => {
            setLungingEntity((prev) => (prev === entityKey ? null : prev));
        }, 350);
    };

    const activeHero = players[activeHeroIndex] ?? players[0] ?? null;
    const isPlayerTurn =
        activeEntityId === "PLAYER" && activeHero !== null && activeHero.hp > 0;
    const partyRouteParam = players.map((p) => p.id).join(",");

    useEffect(() => {
        if (!battleId) return;

        const loadBattle = async () => {
            try {
                const data: BattleData = await getBattleById(battleId);
                const loadedPlayers = Array.isArray(data.players)
                    ? data.players
                    : [];

                setPlayers(loadedPlayers);
                const firstAliveIndex = Math.max(
                    0,
                    loadedPlayers.findIndex((p) => p.hp > 0),
                );
                setActiveHeroIndex(firstAliveIndex);
                setEnemies(data.enemies ?? []);

                const firstHero =
                    loadedPlayers[firstAliveIndex] ?? loadedPlayers[0];
                if (firstHero?.classType) {
                    try {
                        const spells = await getSpellsByClass(
                            firstHero.classType,
                        );
                        setAvailableSpells(spells);
                    } catch (error) {
                        console.error("Erro ao carregar magias", error);
                    }
                }
            } catch (error) {
                console.error(error);
            }
        };
        loadBattle();
    }, [battleId]);

    useEffect(() => {
        if (!activeHero?.classType) return;

        let cancelled = false;
        const loadHeroSpells = async () => {
            try {
                const spells = await getSpellsByClass(activeHero.classType);
                if (!cancelled) {
                    setAvailableSpells(spells);
                }
            } catch (error) {
                console.error("Erro ao carregar magias", error);
            }
        };
        loadHeroSpells();

        return () => {
            cancelled = true;
        };
    }, [activeHero?.id, activeHero?.classType]);

    // Vitória quando todos os inimigos morrem
    useEffect(() => {
        if (!battleId || players.length === 0) return;
        const allEnemiesDead =
            enemies.length > 0 && enemies.every((e) => e.hp <= 0);

        if (allEnemiesDead) {
            setShowVictoryModal(true);
        }
    }, [enemies, battleId, players.length]);

    // Derrota quando todos os heróis da party chegam a HP <= 0
    useEffect(() => {
        if (players.length > 0 && players.every((p) => p.hp <= 0)) {
            setShowDeathModal(true);
        }
    }, [players]);

    const advanceHeroTurnOrEnemyTurn = async (
        currentPlayers: BattlePlayer[],
        currentEnemies: BattleEnemy[],
        fromIndex: number,
    ) => {
        const nextAliveIndex = currentPlayers.findIndex(
            (p, idx) => idx > fromIndex && p.hp > 0,
        );

        if (nextAliveIndex !== -1) {
            setActiveHeroIndex(nextAliveIndex);
            setActiveTurnName(currentPlayers[nextAliveIndex].name);
            setActiveEntityId("PLAYER");
            return;
        }

        await processEnemyTurns(currentEnemies, currentPlayers);
    };

    const processEnemyTurns = async (
        currentEnemies: BattleEnemy[],
        currentPlayers: BattlePlayer[],
    ) => {
        if (!battleId) return;
        let currentPartyState = currentPlayers.map((p) => ({ ...p }));

        setIsSelectingTarget(false);
        setSelectedSpell(null);
        setSelectedTargets([]);

        for (const enemy of currentEnemies) {
            if (enemy.hp <= 0) continue;

            const aliveTargets = currentPartyState.filter((p) => p.hp > 0);
            if (aliveTargets.length === 0) break;

            const targetHero =
                aliveTargets[Math.floor(Math.random() * aliveTargets.length)];

            setActiveTurnName(enemy.name);
            setActiveEntityId(enemy.enemy_id);

            await new Promise((res) => setTimeout(res, 750));
            triggerLunge(enemy.enemy_id);

            try {
                const prevHp =
                    currentPartyState.find((p) => p.id === targetHero.id)?.hp ??
                    targetHero.hp;

                const updatedHero = await enemyAttack(
                    battleId,
                    enemy.enemy_id,
                    targetHero.id,
                );
                const dealt = Math.max(0, prevHp - updatedHero.hp);

                currentPartyState = currentPartyState.map((p) =>
                    p.id === updatedHero.id ? updatedHero : p,
                );

                setPlayers(currentPartyState);

                const heroKey = `PLAYER_${updatedHero.id}`;
                setDamagedEntity(heroKey);
                spawnPopup(heroKey, dealt > 0 ? `-${dealt}` : "MISS", "damage");
                setTimeout(() => {
                    setDamagedEntity((prev) =>
                        prev === heroKey ? null : prev,
                    );
                }, 320);
            } catch (err) {
                console.error("Erro ao processar turno do inimigo", err);
            }

            await new Promise((res) => setTimeout(res, 650));
        }

        const firstAliveAfterEnemies = currentPartyState.findIndex(
            (p) => p.hp > 0,
        );
        if (firstAliveAfterEnemies !== -1) {
            setActiveHeroIndex(firstAliveAfterEnemies);
            setActiveTurnName(currentPartyState[firstAliveAfterEnemies].name);
            setActiveEntityId("PLAYER");
        }
    };

    const handlePlayerAttackClick = () => {
        if (isPlayerTurn) setIsSelectingTarget(!isSelectingTarget);
    };

    const handleTakeBreath = async () => {
        if (!isPlayerTurn || !activeHero) return;

        const heroKey = `PLAYER_${activeHero.id}`;
        const prevHp = activeHero.hp;
        const prevMana = activeHero.mana;

        setBreathingEntity(heroKey);

        try {
            const updatedHero = await takeBreath(activeHero.id);
            const updatedParty = players.map((p) =>
                p.id === updatedHero?.id ? updatedHero : p,
            );
            setPlayers(updatedParty);
            if (!updatedHero) return;
            const hpDiff = updatedHero.hp - prevHp;
            const manaDiff = updatedHero.mana - prevMana;

            spawnPopup(
                heroKey,
                hpDiff > 0 ? `+${hpDiff} HP` : "BREATH",
                hpDiff > 0 ? "heal" : "mana",
            );
            if (manaDiff > 0) {
                spawnPopup(heroKey, `+${manaDiff} MP`, "mana");
            }

            setTimeout(() => {
                setBreathingEntity((prev) => (prev === heroKey ? null : prev));
            }, 1200);
            await new Promise((res) => setTimeout(res, 1200));
            await advanceHeroTurnOrEnemyTurn(
                updatedParty,
                enemies,
                activeHeroIndex,
            );
        } catch (error) {
            console.error("Erro ao recuperar fôlego:", error);
        }
    };

    const handleVictoryContinue = async () => {
        if (players.length === 0 || !battleId) return;

        try {
            await endBattle(battleId);
            navigate(`/game/${partyRouteParam}`);
        } catch (error) {
            console.error("Erro ao encerrar batalha após vitória", error);
        }
    };

    const handleEnemySelect = async (targetEnemy: BattleEnemy) => {
        if (
            !isPlayerTurn ||
            !battleId ||
            !activeHero ||
            targetEnemy.hp <= 0 ||
            (showSpellsMenu && !selectedSpell)
        )
            return;

        if (selectedSpell) {
            setSelectedTargets((prev) => {
                if (prev.includes(targetEnemy.enemy_id)) {
                    return prev.filter((id) => id !== targetEnemy.enemy_id);
                }
                if (prev.length >= selectedSpell.numTargets) {
                    return prev;
                }
                return [...prev, targetEnemy.enemy_id];
            });
            return;
        }

        if (!isSelectingTarget) return;
        setIsSelectingTarget(false);

        const heroKey = `PLAYER_${activeHero.id}`;
        const prevEnemyHp = targetEnemy.hp;
        triggerLunge(heroKey);

        try {
            const updatedEnemy = await playerAttack(
                battleId,
                activeHero.id,
                targetEnemy.enemy_id,
            );
            const dealt = Math.max(0, prevEnemyHp - updatedEnemy.hp);

            const updatedEnemies = enemies.map((e) =>
                e.enemy_id === targetEnemy.enemy_id ? updatedEnemy : e,
            );
            setEnemies(updatedEnemies);

            setDamagedEntity(targetEnemy.enemy_id);
            spawnPopup(
                targetEnemy.enemy_id,
                dealt > 0 ? `-${dealt}` : "MISS",
                "damage",
            );
            setTimeout(() => {
                setDamagedEntity((prev) =>
                    prev === targetEnemy.enemy_id ? null : prev,
                );
            }, 320);

            await new Promise((res) => setTimeout(res, 1000));
            await advanceHeroTurnOrEnemyTurn(
                players,
                updatedEnemies,
                activeHeroIndex,
            );
        } catch (error) {
            console.error(error);
            setIsSelectingTarget(false);
        }
    };

    const handleFlee = async () => {
        if (!isPlayerTurn || !battleId || players.length === 0) return;

        const aliveEnemies = enemies.filter((e) => e.hp > 0);
        const totalLevel = aliveEnemies.reduce((acc, e) => acc + e.level, 0);
        const chance = Math.max(10, 80 - totalLevel * 5);

        const roll = Math.random() * 100;
        if (roll <= chance) {
            await endBattle(battleId);
            navigate(`/game/${partyRouteParam}`);
        } else {
            setShowFleeModal(true);
        }
    };

    const handleConfirmSpell = async () => {
        if (
            !selectedSpell ||
            selectedTargets.length === 0 ||
            !battleId ||
            !activeHero
        )
            return;

        const spellBeingCast = selectedSpell;
        const casterId = activeHero.id;
        const heroKey = `PLAYER_${casterId}`;
        const prevHpById = new Map(enemies.map((e) => [e.enemy_id, e.hp]));

        setSelectedSpell(null);
        setShowSpellsMenu(false);
        setIsSelectingTarget(false);
        triggerLunge(heroKey);

        try {
            const updatedAffectedEnemies = await useSpell({
                battle_id: battleId,
                character_id: casterId,
                targets: selectedTargets,
                spell: spellBeingCast.id,
            });

            const updatedParty = players.map((p) =>
                p.id === casterId
                    ? {
                          ...p,
                          mana: Math.max(0, p.mana - spellBeingCast.manaCost),
                      }
                    : p,
            );
            setPlayers(updatedParty);

            const affectedIds = new Set(
                updatedAffectedEnemies.map((a) => a.enemy_id),
            );
            let newEnemiesState = [...enemies];
            updatedAffectedEnemies.forEach((affected) => {
                newEnemiesState = newEnemiesState.map((e) =>
                    e.enemy_id === affected.enemy_id ? affected : e,
                );
                const prevHp = prevHpById.get(affected.enemy_id) ?? affected.hp;
                const dealt = Math.max(0, prevHp - affected.hp);
                spawnPopup(
                    affected.enemy_id,
                    dealt > 0 ? `-${dealt}` : "0",
                    "damage",
                );
            });

            setEnemies(newEnemiesState);
            setSelectedTargets([]);

            if (affectedIds.size > 0) {
                setDamagedEntity(Array.from(affectedIds)[0]);
                setTimeout(() => setDamagedEntity(null), 320);
            }

            await new Promise((res) => setTimeout(res, 1000));
            await advanceHeroTurnOrEnemyTurn(
                updatedParty,
                newEnemiesState,
                activeHeroIndex,
            );
        } catch (error) {
            console.error("Erro ao conjurar magia:", error);
            setSelectedTargets([]);
        }
    };

    const handleCloseFleeModal = async () => {
        setShowFleeModal(false);
        if (players.length > 0) {
            await processEnemyTurns(enemies, players);
        }
    };

    const handleRevive = async () => {
        if (players.length === 0) return;

        try {
            await Promise.all(players.map((hero) => reviveCharacter(hero.id)));

            if (battleId) {
                await endBattle(battleId).catch(console.error);
            }

            navigate(`/game/${partyRouteParam}`);
        } catch (err) {
            console.error("Erro ao reviver personagem", err);
        }
    };

    if (players.length === 0 || !activeHero)
        return (
            <div
                style={{
                    color: "black",
                    textAlign: "center",
                    marginTop: "20%",
                }}
            >
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
                        <button
                            style={styles.actionButton}
                            onClick={handleRevive}
                        >
                            Reviver
                        </button>
                    </div>
                </div>
            )}

            {showFleeModal && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <span style={styles.modalText}>
                            Flee attempt failed
                        </span>
                        <button
                            style={styles.actionButton}
                            onClick={handleCloseFleeModal}
                        >
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
                        <span
                            style={{ fontSize: "1.2rem", marginBottom: "1rem" }}
                        >
                            Todos os inimigos foram derrotados.
                        </span>
                        <button
                            style={styles.actionButton}
                            onClick={handleVictoryContinue}
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div style={styles.headerArea}>
                <div style={styles.turnIndicator}>
                    Turn:{" "}
                    {activeEntityId === "PLAYER"
                        ? activeHero.name
                        : activeTurnName}
                </div>
            </div>

            {/* ARENA */}
            <div style={styles.battleArena}>
                <div style={styles.playerSide}>
                    {players.map((hero, idx) => {
                        const heroKey = `PLAYER_${hero.id}`;
                        const heroPopups = popups.filter(
                            (p) => p.targetKey === heroKey,
                        );
                        const isCurrentHero =
                            activeEntityId === "PLAYER" &&
                            idx === activeHeroIndex &&
                            hero.hp > 0;
                        const isHeroDamaged = damagedEntity === heroKey;
                        const isLunging = lungingEntity === heroKey;
                        const isBreathing = breathingEntity === heroKey;

                        return (
                            <div key={hero.id} style={styles.enemyWrapper}>
                                <div style={styles.characterName}>
                                    {hero.name}
                                    {isCurrentHero && (
                                        <span className="attacking-icon">
                                            ⚔️
                                        </span>
                                    )}
                                </div>
                                <div
                                    onAnimationEnd={() => {
                                        if (isBreathing) {
                                            setBreathingEntity(null);
                                        }
                                    }}
                                    className={`
        card-animated
        ${isHeroDamaged ? "card-damaged hit-shake" : ""}
        ${isLunging ? "lunge-right" : ""}
        ${isBreathing ? "card-breath" : ""}
        ${isCurrentHero ? "card-active-player" : ""}
        ${!isCurrentHero && !isBreathing ? "card-dimmed" : ""}
        ${hero.hp <= 0 ? "card-ko" : ""}
      `}
                                    style={{
                                        ...styles.card,
                                        position: "relative",
                                        overflow: "visible",
                                        opacity: hero.hp <= 0 ? 0.45 : 1,
                                    }}
                                >
                                    {heroPopups.map((popup) => (
                                        <span
                                            key={popup.id}
                                            className={`floating-text floating-${popup.variant}`}
                                        >
                                            {popup.text}
                                        </span>
                                    ))}

                                    <img
                                        src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(
                                            hero.classType || hero.name,
                                        )}`}
                                        alt={hero.name}
                                        style={styles.characterImage}
                                    />

                                    <div style={styles.barsContainer}>
                                        <div style={styles.barOuter}>
                                            <div
                                                className="hp-bar-inner"
                                                style={{
                                                    width: `${Math.max(0, (hero.hp / hero.maxHp) * 100)}%`,
                                                }}
                                            />
                                            <span style={styles.barText}>
                                                {Math.max(0, hero.hp)}/
                                                {hero.maxHp}
                                            </span>
                                        </div>
                                        <div style={styles.barOuter}>
                                            <div
                                                className="mana-bar-inner"
                                                style={{
                                                    width: `${(hero.mana / hero.maxMana) * 100}%`,
                                                }}
                                            />
                                            <span style={styles.barText}>
                                                {hero.mana}/{hero.maxMana}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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

                {/* ENEMY CARDS */}
                <div style={styles.enemySide}>
                    {enemies.map((enemy) => {
                        const isThisEnemyActive =
                            activeEntityId === enemy.enemy_id;
                        const isSomeoneElseAttacking =
                            activeEntityId !== "PLAYER" && !isThisEnemyActive;
                        const isSelectedForSpell = selectedTargets.includes(
                            enemy.enemy_id,
                        );

                        return (
                            <EnemyCard
                                key={enemy.enemy_id}
                                enemy={enemy}
                                isThisEnemyActive={isThisEnemyActive}
                                onClick={handleEnemySelect}
                                damagedEntity={damagedEntity}
                                isSelectedForSpell={isSelectedForSpell}
                                isSelectingTarget={isSelectingTarget}
                                isSomeoneElseAttacking={isSomeoneElseAttacking}
                                isLunging={lungingEntity === enemy.enemy_id}
                                selectedSpell={selectedSpell}
                                popups={popups.filter(
                                    (p) => p.targetKey === enemy.enemy_id,
                                )}
                            />
                        );
                    })}
                </div>
            </div>

            {/* ACTION MENU */}
            <div style={styles.actionMenu}>
                {selectedSpell ? (
                    <>
                        <button
                            style={{
                                ...styles.actionButton,
                                ...(selectedTargets.length === 0
                                    ? styles.disabledButton
                                    : {}),
                            }}
                            disabled={selectedTargets.length === 0}
                            onClick={handleConfirmSpell}
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
                    <>
                        {availableSpells.length === 0 && (
                            <span
                                style={{ color: "black", alignSelf: "center" }}
                            >
                                No spells found.
                            </span>
                        )}

                        {availableSpells.map((spell) => (
                            <button
                                key={spell.id}
                                style={{
                                    ...styles.actionButton,
                                    ...(activeHero.mana < spell.manaCost
                                        ? styles.disabledButton
                                        : {}),
                                }}
                                disabled={activeHero.mana < spell.manaCost}
                                onClick={() => {
                                    setSelectedSpell(spell);
                                    setSelectedTargets([]);
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
                    <>
                        <button
                            style={{
                                ...styles.actionButton,
                                ...(!isPlayerTurn ||
                                showDeathModal ||
                                showVictoryModal
                                    ? styles.disabledButton
                                    : {}),
                            }}
                            disabled={
                                !isPlayerTurn ||
                                showDeathModal ||
                                showVictoryModal
                            }
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
                            onClick={handleTakeBreath}
                        >
                            Take Breath
                        </button>
                        <button
                            style={{
                                ...styles.actionButton,
                                ...styles.disabledButton,
                            }}
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

const styles: Record<string, React.CSSProperties> = {
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
        justifyContent: "center",
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
    battleArena: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        // flex: 1,
        // marginBottom: "1rem",
        // backgroundColor: "#1e293b",
        border: "3px solid #2b4570",
        borderRadius: "12px",
        maxWidth: "75%",
        width: "100%",
        padding: "1rem 0 1rem 0",
    },
    playerSide: {
        display: "flex",
        flexDirection: "column",
        gap: "0.9rem",
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
    characterImage: {
        maxHeight: "55px",
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
    avatarPlaceholder: {
        width: "44px",
        height: "44px",
        backgroundColor: "#334155",
        border: "1px solid #64748b",
        flexShrink: 0,
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
    actionMenu: {
        bottom: "30px",
        display: "flex",
        justifyContent: "center",
        flexDirection: "row",
        gap: "15px",
        zIndex: 10,
        paddingBottom: "16px",
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
        minWidth: "130px",
    },
    disabledButton: {
        opacity: 0.5,
        cursor: "not-allowed",
    },
};
