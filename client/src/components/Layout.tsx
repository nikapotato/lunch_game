import React, { useEffect, useState } from 'react';
import { styled, Theme } from '@mui/material/styles';
import { AppBar, Toolbar, Container, Button, Modal, Box, Typography, TextField } from '@mui/material';

import { isUsernameValid } from '../utils/userUtils';
import { useUser } from '../context/UserContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { username, setUsername } = useUser();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!username) {
      setIsModalOpen(true);
    }
  }, [username]);

  const handleSaveDisplayName = () => {
    if (isUsernameValid(username)) {
      sessionStorage.setItem('username', username);
      setIsModalOpen(false);
    } else {
      setError('Please enter a valid username.');
    }
  };

  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
  };

  return (
    <LayoutContainer>
      <Header position="static">
        <Toolbar>
          <StyledTitle>
            Lunch Game
          </StyledTitle>
          <StyledButton href="/">
            Home
          </StyledButton>
          <StyledButton href="/history">
            History
          </StyledButton>
        </Toolbar>
      </Header>

      <Content>
        {children}
      </Content>

      <Footer position="fixed">
        <Toolbar>
          <StyledFooterTitle>
            Copyright &copy; Lunch Game
          </StyledFooterTitle>
        </Toolbar>
      </Footer>

      <Modal
        open={isModalOpen}
        onClose={() => {}}
      >
        <ModalBox>
          <form onSubmit={(e) => { e.preventDefault(); handleSaveDisplayName(); }}>
            <Typography id="username-modal-title" variant="h6" component="h2" gutterBottom>
              Please enter your username
            </Typography>
            <TextField
              label="Username"
              value={username}
              onChange={handleDisplayNameChange}
              fullWidth
              margin="normal"
              error={!!error}
              helperText={error}
            />
            <StyledSaveButton
              type="submit"
              variant="contained"
              fullWidth
              disabled={!isUsernameValid(username)}
            >
              Save
            </StyledSaveButton>
          </form>
        </ModalBox>
      </Modal>
    </LayoutContainer>
  );
};

const StyledSaveButton = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.common.black,
  color: theme.palette.common.white,
  '&:hover': {
    backgroundColor: theme.palette.grey[800],
  },
}));

const ModalBox = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  padding: '1rem',
  width: '90%',
}));

const LayoutContainer = styled('div')(() => ({
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  backgroundColor: '#ffffff',
}));

const Header = styled(AppBar)(({ theme }: { theme: Theme }) => ({
  backgroundColor: theme.palette.background.paper,
  boxShadow: 'none',
})).withComponent('header');

const Footer = styled(AppBar)(({ theme }) => ({
  component: 'footer',
  top: 'auto',
  bottom: 0,
  backgroundColor: '#000',
  boxShadow: 'none',
}));

const Content = styled(Container)(({ theme }) => ({
  flex: 1,
  padding: '1rem',
}));

const StyledTitle = styled('div')(({ theme }) => ({
  flexGrow: 1,
  fontWeight: 'bold',
  color: theme.palette.text.primary,
  fontSize: '1.5rem',
}));

const StyledButton = styled(Button)(({ theme }) => ({
  fontSize: '1rem',
  color: theme.palette.text.primary,
}));

const StyledFooterTitle = styled('div')(({ theme }) => ({
  flexGrow: 1,
  color: theme.palette.common.white,
  fontSize: '0.8rem',
}));

export default Layout;
