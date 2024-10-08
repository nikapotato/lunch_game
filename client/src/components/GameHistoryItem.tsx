import React from 'react';
import { Typography, ListItem, ListItemText, Divider } from '@mui/material';

import { Meal, Game } from '../types/types';

import { convertToCZK } from '../utils/currencyUtils';

const GameHistoryItem: React.FC<{ game: Game }> = ({ game }) => {
  const totalInCZK = game.meals.reduce((total, meal) => {
    return total + convertToCZK(meal.amount, meal.currency);
  }, 0);

  return (
    <>
      <ListItem alignItems="flex-start">
        <ListItemText
          primary={`Game on ${new Date(game.created_at_utc).toLocaleString()}`}
          secondary={
            <>
              <Typography variant="body2" component="div">
                <strong>Room ID:</strong> {game.room_id}
              </Typography>
              <Typography variant="body2" component="div">
                <strong>Players:</strong>{' '}
                {game.players ? game.players.join(', ') : 'N/A'}
              </Typography>
              <Typography variant="body2" component="div">
                <strong>Who was treated for lunch:</strong>{' '}
                {game.winners ? game.winners.join(', ') : 'N/A'}
              </Typography>
              <Typography variant="body2" component="div">
                <strong>Who paid for lunch:</strong> {game.loser || 'N/A'}
              </Typography>
              <div>
                <Typography variant="body2" component="div">
                  <strong>Meals:</strong>
                </Typography>
                <ul>
                  {game.meals.map((meal: Meal, index: number) => (
                    <li key={index}>
                      {meal.player}: {meal.amount.toFixed(2)} {meal.currency}
                    </li>
                  ))}
                </ul>
              </div>
              <Typography variant="body2" component="div">
                <strong>Final Price in CZK:</strong> {totalInCZK.toFixed(2)} CZK
              </Typography>
            </>
          }
          secondaryTypographyProps={{ component: 'div' }}
        />
      </ListItem>
      <Divider />
    </>
  );
};

export default GameHistoryItem;
