import { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  CircularProgress,
  Container,
  CssBaseline,
  Tab,
  Tabs,
  Toolbar,
  Typography,
  Alert,
  Paper,
} from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { useQuery } from '@tanstack/react-query';

import { fetchConfig } from './api/config';
import BundestagSearch from './components/BundestagSearch';
import GeminiWorkspace from './components/GeminiWorkspace';
import SettingsPanel from './components/SettingsPanel';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0c4a6e',
    },
    secondary: {
      main: '#0ea5e9',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
});

const App = () => {
  const [tab, setTab] = useState(0);
  const { data: config, isLoading, error } = useQuery({
    queryKey: ['config'],
    queryFn: fetchConfig,
  });

  const defaultDataset = config?.bundestag?.default_dataset ?? 'vorgang';

  const defaultFilters = useMemo(() => {
    const filters = config?.bundestag?.default_filters ?? {};
    return {
      title: Array.isArray(filters['f.titel']) ? filters['f.titel'].join('; ') : filters['f.titel'] ?? '',
      wahlperiode: Array.isArray(filters['f.wahlperiode']) ? filters['f.wahlperiode'].join(',') : filters['f.wahlperiode'] ?? '',
      vorgangstyp: Array.isArray(filters['f.vorgangstyp']) ? filters['f.vorgangstyp'].join('; ') : filters['f.vorgangstyp'] ?? '',
      deskriptor: Array.isArray(filters['f.deskriptor']) ? filters['f.deskriptor'].join('; ') : filters['f.deskriptor'] ?? '',
      initiative: Array.isArray(filters['f.initiative']) ? filters['f.initiative'].join('; ') : filters['f.initiative'] ?? '',
      dateStart: filters['f.datum.start'] ?? '',
      dateEnd: filters['f.datum.end'] ?? '',
    };
  }, [config]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <Paper elevation={0} sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress />
        </Paper>
      );
    }

    if (error) {
      return (
        <Alert severity="error">Konfiguration konnte nicht geladen werden: {error.message}</Alert>
      );
    }

    if (!config) {
      return (
        <Alert severity="warning">Keine Konfigurationsdaten verfügbar.</Alert>
      );
    }

    switch (tab) {
      case 0:
        return <BundestagSearch defaultDataset={defaultDataset} defaultFilters={defaultFilters} />;
      case 1:
        return <GeminiWorkspace config={config} />;
      case 2:
        return <SettingsPanel config={config} />;
      default:
        return null;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="primary" elevation={1}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              Bundestag Explorer & Gemini Studio
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)">
              Recherche im Dokumentations- und Informationssystem & KI-gestützte Auswertung
            </Typography>
          </Box>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ ml: 4 }}
          >
            <Tab label="DIP-Daten" />
            <Tab label="Gemini-Assistent" />
            <Tab label="Einstellungen" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Box sx={{ py: 4 }}>
        <Container maxWidth="lg">
          {renderContent()}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;
