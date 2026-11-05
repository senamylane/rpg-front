// src/components/BattleScreen.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { 
  getBattleById, 
  playerAttack, 
  endBattle, 
  enemyAttack, 
  reviveCharacter,
  type BattleData, 
  type BattlePlayer, 
  type BattleEnemy 
} from '../api/battleApi';
import './css/BattleScreen.css';

export const BattleScreen: React.FC = () => {
  const navigate = useNavigate();
  const { battleId } = useParams<{ battleId: string }>();
  
  const [player, setPlayer] = useState<BattlePlayer | null>(null);
  const [enemies, setEnemies] = useState<BattleEnemy[]>([]);
  
  const [activeTurnName, setActiveTurnName] = useState<string>('Player');
  const [activeEntityId, setActiveEntityId] = useState<string>('PLAYER');
  const [isSelectingTarget, setIsSelectingTarget] = useState<boolean>(false);
  const [damagedEntity, setDamagedEntity] = useState<string | null>(null);
  
  const [showDeathModal, setShowDeathModal] = useState<boolean>(false);
  const [showFleeModal, setShowFleeModal] = useState<boolean>(false);
  
  const isPlayerTurn = activeEntityId === 'PLAYER';

  useEffect(() => {
    if (!battleId) return;
    
    const loadBattle = async () => {
      try {
        const data = await getBattleById(battleId);
        setPlayer(data.player);
        setEnemies(data.enemies);
      } catch (error) {
        console.error(error);
      }
    };
    loadBattle();
  }, [battleId]);

  // Checa a Vitória (Todos os inimigos mortos)
  useEffect(() => {
    if (!battleId || !player) return;
    const allEnemiesDead = enemies.length > 0 && enemies.every(e => e.hp <= 0);

    if (allEnemiesDead) {
      endBattle(battleId).then(() => {
        navigate(`/game/${player.id}`);
      });
    }
  }, [enemies, battleId, navigate, player]);

  // Checa a Derrota (Player HP <= 0)
  useEffect(() => {
    if (player && player.hp <= 0) {
      setShowDeathModal(true);
    }
  }, [player]);

  const processEnemyTurns = async (currentEnemies: BattleEnemy[], currentPlayer: BattlePlayer) => {
    if (!battleId) return;
    let currentPlayerState = { ...currentPlayer };

    for (const enemy of currentEnemies) {
      if (enemy.hp <= 0) continue;
      if (currentPlayerState.hp <= 0) break;

      // Controle visual da UI (Usa o UUID enemy_id)
      setActiveTurnName(enemy.name);
      setActiveEntityId(enemy.enemy_id);

      await new Promise(res => setTimeout(res, 1000));

      try {
        // Chamada real ao backend (Usa a coluna ID numérica "enemy.id")
        const updatedPlayer = await enemyAttack(battleId, enemy.enemy_id, currentPlayerState.id);
        currentPlayerState = updatedPlayer;
        
        setPlayer(currentPlayerState);
        setDamagedEntity('PLAYER');
        setTimeout(() => setDamagedEntity(null), 300);
      } catch (err) {
        console.error('Erro ao processar turno do inimigo', err);
      }

      await new Promise(res => setTimeout(res, 500));
    }

    if (currentPlayerState.hp > 0) {
      setActiveTurnName('Player');
      setActiveEntityId('PLAYER');
    }
  };

  const handlePlayerAttackClick = () => {
    if (isPlayerTurn) setIsSelectingTarget(true);
  };

  const handleEnemySelect = async (targetEnemy: BattleEnemy) => {
    if (!isSelectingTarget || !isPlayerTurn || !battleId || !player) return;
    if (targetEnemy.hp <= 0) return;

    setIsSelectingTarget(false);

    try {
      const updatedEnemy = await playerAttack(battleId, player.id, targetEnemy.enemy_id);

      const updatedEnemies = enemies.map(e => e.enemy_id === targetEnemy.enemy_id ? updatedEnemy : e);
      setEnemies(updatedEnemies);
      
      setDamagedEntity(targetEnemy.enemy_id);
      setTimeout(() => setDamagedEntity(null), 300);

      await processEnemyTurns(updatedEnemies, player);
    } catch (error) {
      console.error(error);
      setIsSelectingTarget(false);
    }
  };

  const handleFlee = async () => {
    if (!isPlayerTurn || !battleId || !player) return;

    const aliveEnemies = enemies.filter(e => e.hp > 0);
    const totalLevel = aliveEnemies.reduce((acc, e) => acc + e.level, 0);
    const chance = Math.max(10, 80 - (totalLevel * 5));

    const roll = Math.random() * 100;
    if (roll <= chance) {
      await endBattle(battleId);
      navigate(`/game/${player.id}`);
    } else {
      setShowFleeModal(true);
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
      console.error('Erro ao reviver personagem', err);
    }
  };

  if (!player) return <div style={{ color: 'black', textAlign: 'center', marginTop: '20%' }}>Loading Battle...</div>;

  return (
    <div className="battle-container">
      {/* MODAIS */}
      {showDeathModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <span style={styles.modalText}>Você morreu!</span>
            <button style={styles.actionButton} onClick={handleRevive}>Reviver</button>
          </div>
        </div>
      )}

      {showFleeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <span style={styles.modalText}>Flee attempt failed</span>
            <button style={styles.actionButton} onClick={handleCloseFleeModal}>OK</button>
          </div>
        </div>
      )}

      {/* RESTANTE DA TELA (idêntico à versão anterior) */}
      <h2 style={styles.turnIndicator}>Turn: {activeTurnName}</h2>

      <div style={styles.battleArena}>
        <div style={styles.playerSide}>
          <div style={styles.characterName}>{player.name}</div>
          <div 
            className={damagedEntity === 'PLAYER' ? 'card-damaged' : ''}
            style={{
              ...styles.card,
              ...(activeEntityId === 'PLAYER' && player.hp > 0 ? styles.cardActive : {})
            }}
          >
            <div style={styles.avatarPlaceholder} />
            <div style={styles.barsContainer}>
              <div style={styles.barOuter}>
                <div className="hp-bar-inner" style={{ width: `${Math.max(0, (player.hp / player.maxHp) * 100)}%` }} />
                <span style={styles.barText}>{Math.max(0, player.hp)}/{player.maxHp}</span>
              </div>
              <div style={styles.barOuter}>
                <div className="mana-bar-inner" style={{ width: `${(player.mana / player.maxMana) * 100}%` }} />
                <span style={styles.barText}>{player.mana}/{player.maxMana}</span>
              </div>
            </div>
          </div>
        </div>

        <div style={styles.centerAction}>
          {isSelectingTarget && (
            <div style={styles.selectTargetText}>Select an enemy<br/>to attack</div>
          )}
        </div>

        <div style={styles.enemySide}>
          {enemies.map((enemy) => (
            <div key={enemy.enemy_id} style={styles.enemyWrapper}>
              <div style={styles.characterName}>{enemy.name}</div>
              <div
                onClick={() => handleEnemySelect(enemy)}
                className={`
                  ${isSelectingTarget && enemy.hp > 0 ? 'targetable-enemy' : ''} 
                  ${damagedEntity === enemy.enemy_id ? 'card-damaged' : ''}
                `}
                style={{
                  ...styles.card,
                  ...(activeEntityId === enemy.enemy_id ? styles.cardActive : {}),
                  opacity: enemy.hp <= 0 ? 0.3 : 1,
                }}
              >
                <div style={styles.avatarPlaceholder} />
                <div style={styles.barsContainer}>
                  <div style={styles.barOuter}>
                    <div className="hp-bar-inner" style={{ width: `${Math.max(0, (enemy.hp / enemy.maxHp) * 100)}%` }} />
                    <span style={styles.barText}>{Math.max(0, enemy.hp)}/{enemy.maxHp}</span>
                  </div>
                  <div style={styles.barOuter}>
                    <div className="mana-bar-inner" style={{ width: `${(enemy.mana / enemy.maxMana) * 100}%` }} />
                    <span style={styles.barText}>{enemy.mana}/{enemy.maxMana}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <hr style={styles.divider} />

      <div style={styles.actionMenu}>
        <button 
          style={{ ...styles.actionButton, ...(!isPlayerTurn || showDeathModal ? styles.disabledButton : {}) }} 
          disabled={!isPlayerTurn || showDeathModal}
          onClick={handlePlayerAttackClick}
        >
          Attack
        </button>
        <button style={{ ...styles.actionButton, ...styles.disabledButton }} disabled>
          Use Spell
        </button>
        <button style={{ ...styles.actionButton, ...styles.disabledButton }} disabled>
          Use Item
        </button>
        <button 
          style={{ ...styles.actionButton, ...(!isPlayerTurn || showDeathModal ? styles.disabledButton : {}) }} 
          disabled={!isPlayerTurn || showDeathModal}
          onClick={handleFlee}
        >
          Flee
        </button>
      </div>
    </div>
  );
};

// Objeto styles permanece o mesmo da resposta anterior...
const styles: Record<string, React.CSSProperties> = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    border: '5px solid #000000',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem',
    alignItems: 'center',
    boxShadow: '0px 0px 20px rgba(0,0,0,0.5)',
  },
  modalText: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#000000',
  },
  turnIndicator: {
    textAlign: 'center',
    fontSize: '1.8rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
  },
  battleArena: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexGrow: 1,
    marginBottom: '1rem',
  },
  playerSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '30%',
  },
  centerAction: {
    width: '30%',
    textAlign: 'center',
  },
  selectTargetText: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
  },
  enemySide: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
    width: '30%',
    alignItems: 'center',
  },
  enemyWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  characterName: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    marginBottom: '0.3rem',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    border: '3px solid #000000',
    padding: '0.5rem',
    width: '280px',
    gap: '0.5rem',
    transition: 'border 0.2s, transform 0.1s',
  },
  cardActive: {
    borderColor: '#3b82f6',
  },
  avatarPlaceholder: {
    width: '60px',
    height: '60px',
    backgroundColor: '#3f3f46',
    border: '1px solid #71717a',
  },
  barsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
    flexGrow: 1,
  },
  barOuter: {
    position: 'relative',
    height: '24px',
    backgroundColor: '#000000',
    border: '2px solid #000000',
    overflow: 'hidden',
  },
  barText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '1px 1px 2px #000',
  },
  divider: {
    borderTop: '6px solid #000000',
    width: '100%',
    margin: '1.5rem 0',
  },
  actionMenu: {
    display: 'flex',
    justifyContent: 'center',
    gap: '1rem',
    paddingBottom: '1rem',
  },
  actionButton: {
    padding: '1rem 2rem',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#000000',
    backgroundColor: '#ffffff',
    border: '5px solid #000000',
    cursor: 'pointer',
    width: '180px',
    transition: 'background-color 0.2s',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  }
};