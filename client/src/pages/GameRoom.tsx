import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Select,
  MenuItem,
  Box,
} from '@mui/material';

import { useUser } from '../context/UserContext';
import { createWebSocketManager } from '../utils/webSocketManager';

// TODO: Refactoring
const GameRoom: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const location = useLocation();
  const roomName = location.state?.roomName || 'Unknown Room';
  const { username } = useUser();
  const navigate = useNavigate();

  const wsManagerRef = useRef<ReturnType<typeof createWebSocketManager> | null>(null);

  const [gameState, setGameState] = useState({
    players: new Set<string>(),
    gameStarted: false,
    loser: null as string | null,
    winners: [] as string[],
    mealSubmitted: {} as { [player: string]: boolean },
    mealAmount: 0,
    mealCurrency: 'USD',
    gameId: '',
    scores: {} as { [player: string]: number },
    allMealsSubmitted: false,
  });

  const [spinning, setSpinning] = useState<boolean>(false);

  // Current player
  const playersArray = Array.from(gameState.players);
  const currentPlayerIndex = playersArray.indexOf(username);
  const currentPlayer = currentPlayerIndex !== -1 ? playersArray[currentPlayerIndex] : null;

  // Latest state values using refs
  const playersRef = useRef<Set<string>>(gameState.players);
  const scoresRef = useRef<{ [player: string]: number }>(gameState.scores);
  const hasSpinRef = useRef<{ [player: string]: boolean }>({});

  // Update refs on state changes
  useEffect(() => {
    playersRef.current = gameState.players;
  }, [gameState.players]);

  useEffect(() => {
    scoresRef.current = gameState.scores;
  }, [gameState.scores]);

  useEffect(() => {
    hasSpinRef.current = Object.keys(gameState.scores).reduce((acc, player) => {
      acc[player] = gameState.scores[player] !== undefined;
      return acc;
    }, {} as { [player: string]: boolean });
  }, [gameState.scores]);

  // WS event handlers
  const handleGameStarted = useCallback((data: any) => {
    setGameState((prevState) => ({
      ...prevState,
      gameStarted: true,
      gameId: data.game_id,
      loser: null,
      winners: [],
      mealSubmitted: {},
      scores: {},
      allMealsSubmitted: false,
      mealAmount: 0,
      mealCurrency: 'USD',
    }));
  }, []);

  const handlePlayerList = useCallback((data: any) => {
    const newPlayers = new Set<string>(data.players as string[]);
    setGameState((prevState) => ({
      ...prevState,
      players: newPlayers,
    }));
  }, []);

  const handleUserDisjoined = useCallback((data: any) => {
    setGameState((prevState) => {
      const updatedPlayers = new Set(prevState.players);
      updatedPlayers.delete(data.player);
      return {
        ...prevState,
        players: updatedPlayers,
      };
    });
  }, []);

  const handleMealSubmitted = useCallback((data: any) => {
    setGameState((prevState) => ({
      ...prevState,
      mealSubmitted: {
        ...prevState.mealSubmitted,
        [data.player]: true,
      },
    }));
  }, []);

  const handleGameEnded = useCallback((data: any) => {
    setGameState((prevState) => ({
      ...prevState,
      loser: data.loser,
      winners: data.winners,
    }));
  }, []);

  const handleGameEnd = useCallback(
    (finalScores: { [player: string]: number }) => {
      setGameState((prevState) => ({
        ...prevState,
        scores: finalScores,
      }));
      if (wsManagerRef.current) {
        wsManagerRef.current.send({ type: 'END_GAME', roomId, game_id: gameState.gameId, scores: finalScores });
      }
    },
    [roomId, gameState.gameId]
  );

  const handleSpin = useCallback(
    (data: any) => {
      const player = data.player;
      if (playersRef.current.has(player)) {
        setGameState((prevState) => ({
          ...prevState,
          scores: {
            ...prevState.scores,
            [player]: data.score,
          },
        }));
        setSpinning(false);

        const allSpin = Array.from(playersRef.current).every(
          (p) => hasSpinRef.current[p] || p === player
        );
        if (allSpin) {
          handleGameEnd({ ...scoresRef.current, [player]: data.score });
        }
      }
    },
    [handleGameEnd]
  );

  const handleGameReset = useCallback(() => {
    setGameState({
      players: new Set(),
      gameStarted: false,
      loser: null,
      winners: [],
      mealSubmitted: {},
      scores: {},
      mealAmount: 0,
      mealCurrency: 'USD',
      gameId: '',
      allMealsSubmitted: false,
    });
    localStorage.removeItem('gameRoomState');
  }, []);

  const handleAllMealsSubmitted = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.close();
      wsManagerRef.current = null;
    }
    handleGameReset();
    navigate('/history');
    window.location.reload();
  }, [handleGameReset, navigate]);

  const handleGameState = useCallback((data: any) => {
    setGameState({
      players: new Set(data.players),
      gameStarted: data.gameStarted,
      loser: data.loser,
      winners: data.winners,
      mealSubmitted: data.mealSubmitted,
      scores: data.scores,
      mealAmount: 0,
      mealCurrency: 'USD',
      gameId: data.gameId,
      allMealsSubmitted: false,
    });
  }, []);

  const handleRejoin = useCallback(
    (data: any) => {
      if (data.player === username) {
        setGameState({
          players: new Set(data.players),
          gameStarted: data.gameStarted,
          loser: data.loser,
          winners: data.winners,
          mealSubmitted: data.mealSubmitted,
          scores: data.scores,
          mealAmount: 0,
          mealCurrency: 'USD',
          gameId: data.gameId,
          allMealsSubmitted: false,
        });
      } else {
        setGameState((prevState) => {
          const updatedPlayers = new Set(prevState.players);
          updatedPlayers.add(data.player);
          return {
            ...prevState,
            players: updatedPlayers,
          };
        });
      }
    },
    [username]
  );

  const handleWebSocketError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
  }, []);

  const handleWebSocketClose = useCallback(() => {
    console.log('WebSocket connection closed unexpectedly.');
  }, []);

  // load saved state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('gameRoomState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setGameState({
        players: new Set(parsedState.players),
        gameStarted: parsedState.gameStarted,
        loser: parsedState.loser,
        winners: parsedState.winners,
        mealSubmitted: parsedState.mealSubmitted,
        scores: parsedState.scores,
        mealAmount: parsedState.mealAmount,
        mealCurrency: parsedState.mealCurrency,
        gameId: parsedState.gameId,
        allMealsSubmitted: parsedState.allMealsSubmitted,
      });
    }
  }, []);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!username || !roomId) {
      navigate('/');
      return;
    }

    const initializeWebSocket = () => {
      if (!wsManagerRef.current) {
        wsManagerRef.current = createWebSocketManager(roomId, username);
        wsManagerRef.current.on('error', handleWebSocketError);
        wsManagerRef.current.on('close', handleWebSocketClose);
        wsManagerRef.current.on('open', () => {
        });
      }
    };

    initializeWebSocket();

    return () => {
      if (wsManagerRef.current) {
        wsManagerRef.current.close();
        wsManagerRef.current = null;
      }
    };
  }, [username, roomId, navigate, handleWebSocketError, handleWebSocketClose]);

  // event listeners
  useEffect(() => {
    const wsManager = wsManagerRef.current;
    if (!wsManager) return;

    const listeners = [
      { type: 'PLAYER_LIST', handler: handlePlayerList },
      { type: 'GAME_STARTED', handler: handleGameStarted },
      { type: 'MEAL_SUBMITTED', handler: handleMealSubmitted },
      { type: 'USER_DISJOINED', handler: handleUserDisjoined },
      { type: 'GAME_ENDED', handler: handleGameEnded },
      { type: 'ALL_MEALS_SUBMITTED', handler: handleAllMealsSubmitted },
      { type: 'GAME_STATE', handler: handleGameState },
      { type: 'REJOIN', handler: handleRejoin },
      { type: 'GAME_RESET', handler: handleGameReset },
      { type: 'SPINED', handler: handleSpin },
    ];

    listeners.forEach(({ type, handler }) => {
      wsManager.on(type, handler);
    });

    wsManager.send({ type: 'REJOIN', player: username, roomId });

    return () => {
      listeners.forEach(({ type, handler }) => {
        wsManager.off(type, handler);
      });
    };
  }, [
    handleGameReset,
    handleUserDisjoined,
    handleMealSubmitted,
    handleSpin,
    handleGameStarted,
    handlePlayerList,
    handleGameEnded,
    handleGameState,
    handleAllMealsSubmitted,
    handleRejoin,
    username,
    roomId,
  ]);

  // Save game state to localStorage before unloading
  useEffect(() => {
    const saveState = () => {
      const state = {
        players: Array.from(gameState.players),
        gameStarted: gameState.gameStarted,
        loser: gameState.loser,
        winners: gameState.winners,
        mealSubmitted: gameState.mealSubmitted,
        mealAmount: gameState.mealAmount,
        mealCurrency: gameState.mealCurrency,
        gameId: gameState.gameId,
        scores: gameState.scores,
        allMealsSubmitted: gameState.allMealsSubmitted,
      };
      localStorage.setItem('gameRoomState', JSON.stringify(state));
    };

    window.addEventListener('beforeunload', saveState);

    return () => {
      window.removeEventListener('beforeunload', saveState);
    };
  }, [gameState]);

  // Game actions
  const startGame = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.send({
        type: 'START_GAME',
        roomId,
        players: Array.from(gameState.players),
      });
    }
  }, [roomId, gameState.players]);

  const submitMeal = useCallback(() => {
    if (wsManagerRef.current && gameState.gameId) {
      wsManagerRef.current.send({
        type: 'SUBMIT_MEAL',
        player: username,
        meal: { amount: gameState.mealAmount, currency: gameState.mealCurrency },
        game_id: gameState.gameId,
      });
      setGameState((prevState) => ({
        ...prevState,
        mealSubmitted: {
          ...prevState.mealSubmitted,
          [username]: true,
        },
      }));
    }
  }, [gameState.gameId, gameState.mealAmount, gameState.mealCurrency, username]);

  const handleSpinClick = useCallback(() => {
    if (!spinning && wsManagerRef.current && gameState.scores[username] === undefined) {
      wsManagerRef.current.send({ type: 'SPIN', player: username });
      setSpinning(true);
    }
  }, [spinning, gameState.scores, username]);

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h5" sx={{ marginBottom: '1rem' }}>
        {roomName}
      </Typography>
      <Typography variant="h6" sx={{ marginBottom: '1rem' }}>
        Players: {Array.from(gameState.players).join(', ')}
      </Typography>

      {!gameState.gameStarted && Array.from(gameState.players).length > 1 && (
        <Button
          variant="contained"
          onClick={startGame}
          sx={{ backgroundColor: 'black', marginBottom: '1rem' }}
        >
          Start Game
        </Button>
      )}
      {/* Roulette */}
      {gameState.gameStarted && !gameState.loser && currentPlayer && (
        <Box sx={{ padding: '1rem', backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6">Roulette</Typography>
          <Typography variant="subtitle1">Current Player: {currentPlayer}</Typography>
          {!gameState.scores[username] && (
            <Button
              variant="contained"
              onClick={handleSpinClick}
              disabled={spinning}
              sx={{ marginTop: '1rem', backgroundColor: '#000' }}
            >
              Spin
            </Button>
          )}
          <Box sx={{ marginTop: '1rem',  
            backgroundColor: '#f5f5f5', padding: '1.5rem' }}>
            <Typography variant="subtitle1" sx={{ marginBottom: '0.5rem' }}>
              Scores:
            </Typography>
            <ul>
              {Array.from(gameState.players).map((player) => (
                <li key={player}>
                  {player}: {gameState.scores[player] ?? 0} points
                </li>
              ))}
            </ul>
          </Box>
        </Box>
      )}
      {/* Game Over */}
      {gameState.gameStarted && gameState.loser && (
        <Dialog open={true}>
          <DialogTitle>Game Over</DialogTitle>
          <DialogContent>
            <Typography variant="body1">
              Loser: {gameState.loser}: {gameState.scores[gameState.loser]} points
            </Typography>
            <Typography variant="body1">
              Winners:{' '}
              {gameState.winners
                .map((winner) => `${winner}: ${gameState.scores[winner] ?? 0} points`)
                .join(', ')}
            </Typography>
            {!gameState.mealSubmitted[username] ? (
              <Box sx={{ marginTop: '1rem' }}>
                <Typography variant="subtitle1">Submit Your Meal Cost</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', marginTop: '0.5rem' }}>
                  <TextField
                    label="Amount"
                    type="number"
                    value={gameState.mealAmount}
                    onChange={(e) =>
                      setGameState((prevState) => ({
                        ...prevState,
                        mealAmount: parseFloat(e.target.value) || 0,
                      }))
                    }
                    sx={{ marginRight: '1rem', width: '10rem' }}
                  />
                  <Select
                    value={gameState.mealCurrency}
                    onChange={(e) =>
                      setGameState((prevState) => ({
                        ...prevState,
                        mealCurrency: e.target.value as string,
                      }))
                    }
                    sx={{ marginRight: '1rem', width: '10rem' }}
                  >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="EUR">EUR</MenuItem>
                    <MenuItem value="Kč">Kč</MenuItem>
                  </Select>
                </Box>
                <Button
                  variant="contained"
                  onClick={submitMeal}
                  sx={{ marginTop: '0.5rem', backgroundColor: '#000' }}
                >
                  Submit Meal
                </Button>
              </Box>
            ) : (
              <Typography variant="body1" sx={{ marginTop: '1rem' }}>
                Meal submitted. Thank you!
              </Typography>
            )}
          </DialogContent>
        </Dialog>
      )}
    </Box>
  );
};

export default GameRoom;

