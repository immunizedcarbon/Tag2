import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Slider,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { runGeminiTask } from '../api/gemini';
import { useAppStore } from '../store/appStore';

const TASK_OPTIONS = [
  { value: 'summary', label: 'Zusammenfassen' },
  { value: 'bullet_points', label: 'Stichpunkte' },
  { value: 'key_points', label: 'Kernaussagen' },
  { value: 'translation', label: 'Übersetzen' },
  { value: 'custom', label: 'Eigene Anweisung' },
];

const tonePresets = ['neutral', 'formell', 'informell', 'analytisch', 'prägnant'];
const lengthPresets = ['sehr kurz', 'kurz', 'mittel', 'ausführlich'];

const GeminiWorkspace = ({ config }) => {
  const selectedTitle = useAppStore((state) => state.selectedTitle);
  const selectedText = useAppStore((state) => state.selectedText);
  const setSelectedContent = useAppStore((state) => state.setSelectedContent);
  const selectedMetadata = useAppStore((state) => state.selectedMetadata);
  const geminiResult = useAppStore((state) => state.geminiResult);
  const setGeminiResult = useAppStore((state) => state.setGeminiResult);
  const resetGeminiResult = useAppStore((state) => state.resetGeminiResult);

  const [task, setTask] = useState(config?.ui?.default_gemini_task ?? 'summary');
  const [language, setLanguage] = useState(config?.ui?.preferred_language ?? 'de');
  const [tone, setTone] = useState('analytisch');
  const [length, setLength] = useState('kurz');
  const [customInstruction, setCustomInstruction] = useState('');
  const [context, setContext] = useState('');
  const [allowEditing, setAllowEditing] = useState(false);
  const [temperature, setTemperature] = useState(config?.gemini?.temperature ?? 0.3);
  const [copyFeedback, setCopyFeedback] = useState(null);

  useEffect(() => {
    if (config?.ui?.default_gemini_task) {
      setTask(config.ui.default_gemini_task);
    }
    if (config?.ui?.preferred_language) {
      setLanguage(config.ui.preferred_language);
    }
    if (typeof config?.gemini?.temperature === 'number') {
      setTemperature(config.gemini.temperature);
    }
  }, [config]);

  const mutation = useMutation({
    mutationFn: runGeminiTask,
    onSuccess: (data) => setGeminiResult(data),
  });

  const hasText = selectedText && selectedText.trim().length > 0;

  const options = useMemo(() => ({
    language,
    tone,
    length,
    context,
    custom_instruction: customInstruction,
    temperature,
  }), [language, tone, length, context, customInstruction, temperature]);

  const handleRun = () => {
    if (!hasText) return;
    mutation.mutate({
      text: selectedText,
      task,
      options,
    });
  };

  const handleTextChange = (event) => {
    setSelectedContent({ title: selectedTitle, text: event.target.value, metadata: selectedMetadata });
  };

  const handleReset = () => {
    resetGeminiResult();
    setCustomInstruction('');
    setContext('');
  };

  return (
    <Stack spacing={3}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Aufbereitung mit Gemini</Typography>
          <TextField
            select
            label="Aufgabe"
            value={task}
            onChange={(event) => setTask(event.target.value)}
            fullWidth
          >
              {TASK_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label={task === 'translation' ? 'Zielsprache' : 'Sprache'}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              fullWidth
            />
            <TextField
              label="Tonfall"
              value={tone}
              onChange={(event) => setTone(event.target.value)}
              fullWidth
              select
            >
              {tonePresets.map((preset) => (
                <MenuItem key={preset} value={preset}>
                  {preset}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Länge"
              value={length}
              onChange={(event) => setLength(event.target.value)}
              fullWidth
              select
            >
              {lengthPresets.map((preset) => (
                <MenuItem key={preset} value={preset}>
                  {preset}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            label="Zusätzlicher Kontext"
            value={context}
            onChange={(event) => setContext(event.target.value)}
            multiline
            minRows={2}
          />
          {task === 'custom' ? (
            <TextField
              label="Eigene Anweisung"
              value={customInstruction}
              onChange={(event) => setCustomInstruction(event.target.value)}
              multiline
              minRows={2}
            />
          ) : null}
          <Box>
            <Typography gutterBottom>Temperatur</Typography>
            <Slider
              value={temperature}
              min={0}
              max={1}
              step={0.05}
              valueLabelDisplay="auto"
              onChange={(_, value) => setTemperature(Array.isArray(value) ? value[0] : value)}
            />
          </Box>
          <FormControlLabel
            control={<Switch checked={allowEditing} onChange={(event) => setAllowEditing(event.target.checked)} />}
            label="Text direkt bearbeiten"
          />
          <TextField
            label={selectedTitle || 'Ausgewählter Text'}
            value={selectedText}
            onChange={handleTextChange}
            multiline
            minRows={12}
            fullWidth
            disabled={!allowEditing}
            helperText={hasText ? 'Überprüfe den Inhalt und starte anschließend Gemini.' : 'Bitte wähle zunächst einen Datensatz in der DIP-Suche aus.'}
          />
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleReset} disabled={mutation.isPending}>
              Zurücksetzen
            </Button>
            <Button
              variant="contained"
              onClick={handleRun}
              disabled={!hasText || mutation.isPending}
            >
              Analyse starten
            </Button>
          </Stack>
          {mutation.isPending ? (
            <Alert severity="info">Gemini verarbeitet den Text …</Alert>
          ) : null}
          {!hasText ? <Alert severity="info">Noch kein Text ausgewählt.</Alert> : null}
        </Stack>
      </Paper>

      {geminiResult ? (
        <Paper elevation={1} sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="h6">Gemini Ergebnis</Typography>
              <Button onClick={async () => {
                if (!geminiResult.text) return;
                try {
                  await navigator.clipboard.writeText(geminiResult.text);
                  setCopyFeedback({ 'type': 'success', 'message': 'Inhalt kopiert.' });
                } catch (error) {
                  setCopyFeedback({ 'type': 'error', 'message': 'Kopieren nicht möglich.' });
                }
              }}>In Zwischenablage kopieren</Button>
            </Stack>
            <Divider />
            <Typography component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono, "Fira Code", monospace)' }}>
              {geminiResult.text}
            </Typography>
            {geminiResult.candidates?.length ? (
              <Stack spacing={1}>
                <Typography variant="subtitle2" gutterBottom>
                  Weitere Kandidaten
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {geminiResult.candidates.map((candidate, index) => (
                    <Button
                      key={`candidate-${index}`}
                      variant="outlined"
                      size="small"
                      onClick={() => setGeminiResult({ ...geminiResult, text: candidate })}
                    >
                      Variante {index + 1}
                    </Button>
                  ))}
                </Stack>
              </Stack>
            ) : null}
        </Stack>
      </Paper>
      ) : null}
      <Snackbar
        open={Boolean(copyFeedback)}
        autoHideDuration={4000}
        onClose={() => setCopyFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {copyFeedback ? (
          <Alert onClose={() => setCopyFeedback(null)} severity={copyFeedback.type} sx={{ width: '100%' }}>
            {copyFeedback.message}
          </Alert>
        ) : null}
      </Snackbar>
    </Stack>
  );
};

export default GeminiWorkspace;
