import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Divider,
  Modal,
  Box,
  Stack,
  styled,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import { Room } from '../types/types';
import { getApiUrl } from '../utils/apiUtils';
import { useUser } from '../context/UserContext';
import { ENDPOINTS } from '../configs/api_config';

const HomePage: React.FC = () => {
  const { username } = useUser();
  const [openModal, setOpenModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);

  const navigate = useNavigate();

  const fetchAvailableRooms = useCallback(async () => {
    try {
      const response = await fetch(getApiUrl(ENDPOINTS.GET_ROOMS));
      if (!response.ok) {
        throw new Error(`Error fetching rooms: ${response.statusText}`);
      }
      const data: Room[] = await response.json();
      setAvailableRooms(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRooms();
  }, [fetchAvailableRooms]);

  const handleCreateRoom = useCallback(async () => {
    if (!username) {
      setOpenModal(true);
      return;
    }
    
    try {
      const response = await fetch(getApiUrl(ENDPOINTS.CREATE_ROOM), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roomName || undefined,
          code: roomCode || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(`Error creating room: ${response.statusText}`);
      }

      // refetch available rooms after creating a new room
      await fetchAvailableRooms();

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setOpenModal(false);
    }
  }, [username, roomName, roomCode, fetchAvailableRooms]);

  const handleJoinRoom = useCallback(
    async (roomId: string, roomName: string, roomCode: string) => {
      try {
        const response = await fetch(getApiUrl(ENDPOINTS.GET_IS_ACTIVE(roomId)));
        if (!response.ok) throw new Error(`Error verifying room status: ${response.statusText}`);

        const isActive = await response.json();
        if (isActive) {
          alert('Room cannot be joined as a game is currently active.');
          return;
        }

        const enteredCode = prompt('Please enter the room code:');
        if (enteredCode !== roomCode) {
          alert('Incorrect room code. Please try again.');
          return;
        }
        
        navigate(`/room/${roomId}`, { state: { roomName, roomId } });
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Unknown error');
      }
    },
    [navigate]
  );

  const handleOpenModal = () => {
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  return (
    <Box sx={{ padding: '1rem' }}>
      {username && (
        <Typography variant="h6" sx={{ marginBottom: '1rem' }}>
          {`Hello ${username}! Want to pay for lunch?`}
        </Typography>
      )}

      {/* Create Room Modal */}
      <Modal
        open={openModal}
        onClose={handleCloseModal}
      >
        <Box
          component="form"
          onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            handleCreateRoom();
          }}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 400,
            bgcolor: 'background.paper',
            boxShadow: 24,
            p: 4,
          }}
        >
          <Stack spacing={2}>
            <Typography id="create-room-modal" variant="h6" component="h2">
              Create New Room
            </Typography>
            <TextField
              label="Enter room name"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              fullWidth
              required
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: '#000',
                '&:hover': { backgroundColor: '#333' },
              }}
              disabled={!username}
              fullWidth
            >
              Create Room
            </Button>
          </Stack>
        </Box>
      </Modal>

      {/* Available Rooms */}
      <StyledTypography
        variant="h5"
        gutterBottom
      >
        Available Game Rooms
        <StyledButton
          variant="contained"
          onClick={handleOpenModal}
          disabled={!username}
        >
          <AddIcon />
        </StyledButton>
      </StyledTypography>
      {availableRooms.length === 0 ? (
        <Typography variant="body1">No available rooms.</Typography>
      ) : (
        <List>
          {availableRooms.map((room: Room) => (
            <React.Fragment key={room.id}>
              <ListItem
                component="div"
                onClick={() => handleJoinRoom(room.id, room.name, room.code)}
              >
                <ListItemText
                  primary={room.name}
                  secondary={`Date Created: ${new Date(
                    room.created_at_utc
                  ).toLocaleString()}`}
                />
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      )}
    </Box>
  );
};

const StyledTypography = styled(Typography)(() => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
}));

const StyledButton = styled(Button)(() => ({
  width: '2rem',  
  height: '2rem',
  backgroundColor: '#000',
  marginLeft: '1rem',
  '&:hover': { backgroundColor: '#333' },
}));

export default HomePage;
