import React, { useEffect, useState } from 'react';
import { Typography, List } from '@mui/material';

import GameHistoryItem from '../components/GameHistoryItem';

import { Game } from '../types/types';

import { getApiUrl } from '../utils/apiUtils';

import { ENDPOINTS } from '../configs/api_config';

const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<Game[]>([]);


  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(getApiUrl(ENDPOINTS.GAME_HISTORY));
        if (!response.ok) {
          throw new Error(`Error fetching history: ${response.statusText}`);
        }
        const data: Game[] = await response.json();
        setHistory(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Game History
      </Typography>
      {history.length === 0 ? (
        <Typography variant="body1">No games have been played yet.</Typography>
      ) : (
        <List>
          {history.map((game) => (
            <GameHistoryItem key={game.id} game={game} />
          ))}
        </List>
      )}
    </div>
  );
};

export default HistoryPage;
