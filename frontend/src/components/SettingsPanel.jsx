import { useEffect, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Divider,
  LinearProgress,
  MenuItem,
  Paper,
  Slider,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { updateConfig } from '../api/config';
import { fetchMetadataOptions } from '../api/bundestag';

const datasetOptions = [
  { value: 'vorgang', label: 'Vorgänge' },
  { value: 'drucksache', label: 'Drucksachen' },
  { value: 'drucksache-text', label: 'Drucksachen (Volltext)' },
  { value: 'plenarprotokoll', label: 'Plenarprotokolle' },
  { value: 'plenarprotokoll-text', label: 'Plenarprotokolle (Volltext)' },
  { value: 'aktivitaet', label: 'Aktivitäten' },
];

const SettingsPanel = ({ config, requiresSetup = false }) => {
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
  const [filterWahlperioden, setFilterWahlperioden] = useState([]);
  const [filterVorgangstypen, setFilterVorgangstypen] = useState([]);
  const [filterInitiativen, setFilterInitiativen] = useState([]);
  const [language, setLanguage] = useState('de');
  const [defaultTask, setDefaultTask] = useState('summary');
  const [feedback, setFeedback] = useState(null);

  const hasBundestagKey = Boolean(config?.bundestag?.has_api_key);

  const { data: metadata, isLoading: metadataLoading, error: metadataError, refetch: refetchMetadata } = useQuery({
    queryKey: ['bundestag-options'],
    queryFn: fetchMetadataOptions,
    enabled: hasBundestagKey,
    staleTime: 1000 * 60 * 30,
  });

  const wahlperiodeOptions = metadata?.wahlperioden ?? [];
  const vorgangstypOptions = metadata?.vorgangstypen ?? [];
  const initiativeOptions = metadata?.initiativen ?? [];

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
    if (Array.isArray(wahlperiodeFilter)) {
      setFilterWahlperioden(
        wahlperiodeFilter
          .map((entry) => Number.parseInt(entry, 10))
          .filter((value) => !Number.isNaN(value))
      );
    } else if (wahlperiodeFilter) {
      const parsed = Number.parseInt(wahlperiodeFilter, 10);
      setFilterWahlperioden(Number.isNaN(parsed) ? [] : [parsed]);
    } else {
      setFilterWahlperioden([]);
    }
    const vorgangstypFilter = filters['f.vorgangstyp'];
    setFilterVorgangstypen(
      Array.isArray(vorgangstypFilter)
        ? vorgangstypFilter.map((entry) => String(entry))
        : vorgangstypFilter
          ? [String(vorgangstypFilter)]
          : []
    );
    const initiativeFilter = filters['f.initiative'];
    setFilterInitiativen(
      Array.isArray(initiativeFilter)
        ? initiativeFilter.map((entry) => String(entry))
        : initiativeFilter
          ? [String(initiativeFilter)]
          : []
    );
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
    if (filterWahlperioden.length) {
      filters['f.wahlperiode'] = filterWahlperioden;
    }
    if (filterVorgangstypen.length) {
      filters['f.vorgangstyp'] = filterVorgangstypen;
    }
    if (filterInitiativen.length) {
      filters['f.initiative'] = filterInitiativen;
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
    if (Array.isArray(wahlperiodeFilter)) {
      setFilterWahlperioden(
        wahlperiodeFilter
          .map((entry) => Number.parseInt(entry, 10))
          .filter((value) => !Number.isNaN(value))
      );
    } else if (wahlperiodeFilter) {
      const parsed = Number.parseInt(wahlperiodeFilter, 10);
      setFilterWahlperioden(Number.isNaN(parsed) ? [] : [parsed]);
    } else {
      setFilterWahlperioden([]);
    }
    const vorgangstypFilter = filters['f.vorgangstyp'];
    setFilterVorgangstypen(
      Array.isArray(vorgangstypFilter)
        ? vorgangstypFilter.map((entry) => String(entry))
        : vorgangstypFilter
          ? [String(vorgangstypFilter)]
          : []
    );
    const initiativeFilter = filters['f.initiative'];
    setFilterInitiativen(
      Array.isArray(initiativeFilter)
        ? initiativeFilter.map((entry) => String(entry))
        : initiativeFilter
          ? [String(initiativeFilter)]
          : []
    );
    setLanguage(config.ui?.preferred_language ?? 'de');
    setDefaultTask(config.ui?.default_gemini_task ?? 'summary');
    setGeminiKey('');
    setBundestagKey('');
    setGeminiKeyTouched(false);
    setBundestagKeyTouched(false);
  };

  return (
    <Stack spacing={3}>
      {requiresSetup ? (
        <Alert severity="info">
          Hinterlege beide API-Schlüssel und speichere die Einstellungen. Danach kannst du Suche und Gemini-Assistent ohne
          weitere Schritte starten.
        </Alert>
      ) : null}
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
          {!hasBundestagKey ? (
            <Alert severity="info">
              Speichere zuerst einen gültigen DIP API-Key, um Vorschlagslisten für Wahlperioden, Vorgangstypen und Initiativen
              zu laden.
            </Alert>
          ) : null}
          {hasBundestagKey && metadataLoading ? <LinearProgress /> : null}
          {metadataError ? (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={() => refetchMetadata()}>
                  Erneut laden
                </Button>
              }
            >
              Filteroptionen konnten nicht geladen werden: {metadataError.message}
            </Alert>
          ) : null}
          <Autocomplete
            multiple
            options={wahlperiodeOptions}
            value={filterWahlperioden}
            onChange={(_, value) => setFilterWahlperioden(value)}
            disableCloseOnSelect
            loading={metadataLoading && hasBundestagKey}
            isOptionEqualToValue={(option, value) => option === value}
            getOptionLabel={(option) => `Wahlperiode ${option}`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Wahlperioden"
                placeholder="Aus Liste auswählen"
                helperText="Mehrfachauswahl möglich"
              />
            )}
          />
          <Autocomplete
            multiple
            freeSolo
            options={vorgangstypOptions}
            value={filterVorgangstypen}
            onChange={(_, value) => setFilterVorgangstypen(value)}
            filterSelectedOptions
            loading={metadataLoading && hasBundestagKey}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Vorgangstypen"
                placeholder="Aus Liste wählen oder tippen"
              />
            )}
          />
          <Autocomplete
            multiple
            freeSolo
            options={initiativeOptions}
            value={filterInitiativen}
            onChange={(_, value) => setFilterInitiativen(value)}
            filterSelectedOptions
            loading={metadataLoading && hasBundestagKey}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Initiativen"
                placeholder="Aus Liste wählen oder tippen"
              />
            )}
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
