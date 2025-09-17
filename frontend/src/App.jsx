import { useEffect, useMemo, useState } from 'react';
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
  const requiresSetup = Boolean(config) && !(config?.gemini?.has_api_key && config?.bundestag?.has_api_key);

  useEffect(() => {
    if (requiresSetup && tab !== 2) {
      setTab(2);
    }
  }, [requiresSetup, tab]);

  const defaultFilters = useMemo(() => {
    const filters = config?.bundestag?.default_filters ?? {};
    const toArray = (value) => {
      if (Array.isArray(value)) return value;
      if (value === undefined || value === null || value === '') return [];
      return [value];
    };

    const wahlperioden = toArray(filters['f.wahlperiode'])
      .map((entry) => Number.parseInt(entry, 10))
      .filter((value) => !Number.isNaN(value));

    const vorgangstypen = toArray(filters['f.vorgangstyp']).map((entry) => String(entry));
    const initiativen = toArray(filters['f.initiative']).map((entry) => String(entry));
    const titelFilter = toArray(filters['f.titel']).map((entry) => String(entry));
    const deskriptorFilter = toArray(filters['f.deskriptor']).map((entry) => String(entry));

    return {
      title: titelFilter.join('; '),
      wahlperioden,
      vorgangstypen,
      initiativen,
      deskriptor: deskriptorFilter.join('; '),
      dateStart: filters['f.datum.start'] ?? '',
      dateEnd: filters['f.datum.end'] ?? '',
      persons: [],
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
        return <SettingsPanel config={config} requiresSetup={requiresSetup} />;
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
            <Tab label="DIP-Daten" disabled={requiresSetup} />
            <Tab label="Gemini-Assistent" disabled={requiresSetup} />
            <Tab label="Einstellungen" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Box sx={{ py: 4 }}>
        <Container maxWidth="lg">
          {requiresSetup ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Hinterlege zuerst die API-Schlüssel für DIP und Gemini im Tab „Einstellungen“. Danach stehen Suche und Assistent
              ohne weitere Schritte zur Verfügung.
            </Alert>
          ) : null}
          {renderContent()}
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default App;
