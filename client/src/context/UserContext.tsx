import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserContextProps {
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('username') || '';
  });

  useEffect(() => {
    localStorage.setItem('username', username);
  }, [username]);

  return (
    <UserContext.Provider value={{ username, setUsername }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
