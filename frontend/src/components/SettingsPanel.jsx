import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  MenuItem,
  Paper,
  Slider,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateConfig } from '../api/config';

const datasetOptions = [
  { value: 'vorgang', label: 'Vorgänge' },
  { value: 'drucksache', label: 'Drucksachen' },
  { value: 'drucksache-text', label: 'Drucksachen (Volltext)' },
  { value: 'plenarprotokoll', label: 'Plenarprotokolle' },
  { value: 'plenarprotokoll-text', label: 'Plenarprotokolle (Volltext)' },
  { value: 'aktivitaet', label: 'Aktivitäten' },
];

const SettingsPanel = ({ config }) => {
  const queryClient = useQueryClient();
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiKeyTouched, setGeminiKeyTouched] = useState(false);
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-pro');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.3);
  const [bundestagKey, setBundestagKey] = useState('');
  const [bundestagKeyTouched, setBundestagKeyTouched] = useState(false);
  const [baseUrl, setBaseUrl] = useState('https://search.dip.bundestag.de/api/v1');
  const [defaultDataset, setDefaultDataset] = useState('vorgang');
  const [filterTitle, setFilterTitle] = useState('');
  const [filterWahlperiode, setFilterWahlperiode] = useState('');
  const [filterVorgangstyp, setFilterVorgangstyp] = useState('');
  const [language, setLanguage] = useState('de');
  const [defaultTask, setDefaultTask] = useState('summary');
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!config) return;
    setGeminiModel(config.gemini?.model ?? 'gemini-2.5-pro');
    setSystemPrompt(config.gemini?.system_prompt ?? '');
    setTemperature(config.gemini?.temperature ?? 0.3);
    setBaseUrl(config.bundestag?.base_url ?? 'https://search.dip.bundestag.de/api/v1');
    setDefaultDataset(config.bundestag?.default_dataset ?? 'vorgang');
    const filters = config.bundestag?.default_filters ?? {};
    const titleFilter = filters['f.titel'];
    setFilterTitle(Array.isArray(titleFilter) ? titleFilter.join('; ') : titleFilter ?? '');
    const wahlperiodeFilter = filters['f.wahlperiode'];
    setFilterWahlperiode(Array.isArray(wahlperiodeFilter) ? wahlperiodeFilter.join(',') : wahlperiodeFilter ?? '');
    const vorgangstypFilter = filters['f.vorgangstyp'];
    setFilterVorgangstyp(Array.isArray(vorgangstypFilter) ? vorgangstypFilter.join('; ') : vorgangstypFilter ?? '');
    setLanguage(config.ui?.preferred_language ?? 'de');
    setDefaultTask(config.ui?.default_gemini_task ?? 'summary');
    setGeminiKey('');
    setBundestagKey('');
    setGeminiKeyTouched(false);
    setBundestagKeyTouched(false);
  }, [config]);

  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(['config'], data);
      setFeedback({ type: 'success', message: 'Einstellungen wurden gespeichert.' });
      setGeminiKey('');
      setBundestagKey('');
      setGeminiKeyTouched(false);
      setBundestagKeyTouched(false);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: error.message });
    },
  });

  const buildDefaultFilters = () => {
    const filters = {};
    if (filterTitle.trim()) {
      filters['f.titel'] = filterTitle.split(';').map((entry) => entry.trim()).filter(Boolean);
    }
    if (filterWahlperiode.trim()) {
      filters['f.wahlperiode'] = filterWahlperiode
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => !Number.isNaN(value));
    }
    if (filterVorgangstyp.trim()) {
      filters['f.vorgangstyp'] = filterVorgangstyp.split(';').map((entry) => entry.trim()).filter(Boolean);
    }
    return filters;
  };

  const handleSubmit = () => {
    const payload = {
      gemini: {
        model: geminiModel,
        system_prompt: systemPrompt,
        temperature: Number(temperature),
      },
      bundestag: {
        base_url: baseUrl,
        default_dataset: defaultDataset,
        default_filters: buildDefaultFilters(),
      },
      ui: {
        preferred_language: language,
        default_gemini_task: defaultTask,
      },
    };

    if (geminiKeyTouched) {
      payload.gemini.api_key = geminiKey;
    }
    if (bundestagKeyTouched) {
      payload.bundestag.api_key = bundestagKey;
    }

    mutation.mutate(payload);
  };

  const handleReset = () => {
    if (!config) return;
    setSystemPrompt(config.gemini?.system_prompt ?? '');
    setGeminiModel(config.gemini?.model ?? 'gemini-2.5-pro');
    setTemperature(config.gemini?.temperature ?? 0.3);
    setBaseUrl(config.bundestag?.base_url ?? 'https://search.dip.bundestag.de/api/v1');
    setDefaultDataset(config.bundestag?.default_dataset ?? 'vorgang');
    const filters = config.bundestag?.default_filters ?? {};
    const titleFilter = filters['f.titel'];
    setFilterTitle(Array.isArray(titleFilter) ? titleFilter.join('; ') : titleFilter ?? '');
    const wahlperiodeFilter = filters['f.wahlperiode'];
    setFilterWahlperiode(Array.isArray(wahlperiodeFilter) ? wahlperiodeFilter.join(',') : wahlperiodeFilter ?? '');
    const vorgangstypFilter = filters['f.vorgangstyp'];
    setFilterVorgangstyp(Array.isArray(vorgangstypFilter) ? vorgangstypFilter.join('; ') : vorgangstypFilter ?? '');
    setLanguage(config.ui?.preferred_language ?? 'de');
    setDefaultTask(config.ui?.default_gemini_task ?? 'summary');
    setGeminiKey('');
    setBundestagKey('');
    setGeminiKeyTouched(false);
    setBundestagKeyTouched(false);
  };

  return (
    <Stack spacing={3}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Gemini-Konfiguration</Typography>
          <TextField
            label="Gemini API Key"
            type="password"
            value={geminiKey}
            onChange={(event) => {
              setGeminiKey(event.target.value);
              setGeminiKeyTouched(true);
            }}
            helperText={config?.gemini?.has_api_key ? `Gespeichert: ${config.gemini.api_key_preview ?? '***'}` : 'Noch kein Schlüssel hinterlegt'}
            placeholder="Neuen Schlüssel eingeben"
            fullWidth
          />
          <TextField
            label="Modell"
            value={geminiModel}
            onChange={(event) => setGeminiModel(event.target.value)}
            fullWidth
          />
          <Box>
            <Typography variant="subtitle2">Temperatur</Typography>
            <Slider
              value={temperature}
              min={0}
              max={1}
              step={0.05}
              onChange={(_, value) => setTemperature(Array.isArray(value) ? value[0] : value)}
              valueLabelDisplay="auto"
            />
          </Box>
          <TextField
            label="System-Prompt"
            value={systemPrompt}
            onChange={(event) => setSystemPrompt(event.target.value)}
            multiline
            minRows={4}
            fullWidth
          />
        </Stack>
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Bundestag API</Typography>
          <TextField
            label="DIP API Key"
            type="password"
            value={bundestagKey}
            onChange={(event) => {
              setBundestagKey(event.target.value);
              setBundestagKeyTouched(true);
            }}
            helperText={config?.bundestag?.has_api_key ? `Gespeichert: ${config.bundestag.api_key_preview ?? '***'}` : 'Noch kein Schlüssel hinterlegt'}
            placeholder="Neuen Schlüssel eingeben"
            fullWidth
          />
          <TextField
            label="Basis-URL"
            value={baseUrl}
            onChange={(event) => setBaseUrl(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Standard-Datensatz"
            value={defaultDataset}
            onChange={(event) => setDefaultDataset(event.target.value)}
            fullWidth
          >
            {datasetOptions.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <Divider flexItem />
          <Typography variant="subtitle2">Standardfilter für die Suche</Typography>
          <TextField
            label="Titel / Schlagwörter (mit ; trennen)"
            value={filterTitle}
            onChange={(event) => setFilterTitle(event.target.value)}
            fullWidth
          />
          <TextField
            label="Wahlperioden (Kommagetrennt)"
            value={filterWahlperiode}
            onChange={(event) => setFilterWahlperiode(event.target.value)}
            fullWidth
          />
          <TextField
            label="Vorgangstypen (mit ; trennen)"
            value={filterVorgangstyp}
            onChange={(event) => setFilterVorgangstyp(event.target.value)}
            fullWidth
          />
        </Stack>
      </Paper>

      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">UI-Einstellungen</Typography>
          <TextField
            label="Bevorzugte Sprache"
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            fullWidth
          />
          <TextField
            select
            label="Standardaktion für Gemini"
            value={defaultTask}
            onChange={(event) => setDefaultTask(event.target.value)}
            fullWidth
          >
            <MenuItem value="summary">Zusammenfassen</MenuItem>
            <MenuItem value="bullet_points">Stichpunkte</MenuItem>
            <MenuItem value="key_points">Kernaussagen</MenuItem>
            <MenuItem value="translation">Übersetzen</MenuItem>
            <MenuItem value="custom">Eigene Anweisung</MenuItem>
          </TextField>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleReset} disabled={mutation.isPending}>
              Zurücksetzen
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={mutation.isPending}>
              Speichern
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {feedback ? (
          <Alert severity={feedback.type} onClose={() => setFeedback(null)} sx={{ width: '100%' }}>
            {feedback.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Stack>
  );
};

export default SettingsPanel;
