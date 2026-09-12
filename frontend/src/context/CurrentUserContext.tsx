import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { API_BASE_URL } from '../lib/apiConfig';
export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  color: string;
};

type CurrentUserState = {
  user: CurrentUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
};

const CurrentUserContext = createContext<CurrentUserState>({
  user: null,
  isLoading: true,
  refreshUser: async () => {},
  logout: async () => {},
});

const API_URL = API_BASE_URL

const ACCENT_COLORS = [
  "#5dcaa5",
  "#7f77dd",
  "#cc785c",
  "#f7f5f0",
  "#dad2c1",
];

function colorForId(id: string): string {
  let hash = 0;

  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }

  return ACCENT_COLORS[Math.abs(hash) % ACCENT_COLORS.length];
}

function mapUser(data: {
  id: string;
  email: string;
  name: string;
}): CurrentUser {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    color: colorForId(data.id),
  };
}

export function CurrentUserProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/me`, {
        credentials: "include",
      });

      if (!response.ok) {
        setUser(null);
        return;
      }

      const data = await response.json();

      setUser(
        mapUser({
          id: data.id,
          email: data.email,
          name: data.name,
        })
      );
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  return (
    <CurrentUserContext.Provider
      value={{
        user,
        isLoading,
        refreshUser,
        logout,
      }}
    >
      {children}
    </CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserState {
  return useContext(CurrentUserContext);
}