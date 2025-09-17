import { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  LinearProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import SummarizeIcon from '@mui/icons-material/Summarize';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import dayjs from 'dayjs';
import Grid from '@mui/material/Grid2';
import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchMetadataOptions, searchDataset, searchPersons } from '../api/bundestag';
import { useAppStore } from '../store/appStore';

const datasetOptions = [
  { value: 'vorgang', label: 'Vorgänge' },
  { value: 'vorgangsposition', label: 'Vorgangspositionen' },
  { value: 'drucksache', label: 'Drucksachen (Metadaten)' },
  { value: 'drucksache-text', label: 'Drucksachen (Volltext)' },
  { value: 'plenarprotokoll', label: 'Plenarprotokolle' },
  { value: 'plenarprotokoll-text', label: 'Plenarprotokolle (Volltext)' },
  { value: 'aktivitaet', label: 'Aktivitäten' },
];

const createInitialFilters = (defaults = {}) => ({
  title: defaults.title ?? '',
  wahlperioden: defaults.wahlperioden ?? [],
  vorgangstypen: defaults.vorgangstypen ?? [],
  initiativen: defaults.initiativen ?? [],
  deskriptor: defaults.deskriptor ?? '',
  dateStart: defaults.dateStart ?? '',
  dateEnd: defaults.dateEnd ?? '',
  persons: defaults.persons ?? [],
});

const buildParams = (filters) => {
  const params = {};
  if (filters.title) {
    params['f.titel'] = filters.title.split(';').map((item) => item.trim()).filter(Boolean);
  }
  if (filters.wahlperioden?.length) {
    params['f.wahlperiode'] = filters.wahlperioden.map((value) => Number(value)).filter((value) => !Number.isNaN(value));
  }
  if (filters.vorgangstypen?.length) {
    params['f.vorgangstyp'] = filters.vorgangstypen;
  }
  if (filters.deskriptor) {
    params['f.deskriptor'] = filters.deskriptor
      .split(';')
      .map((value) => value.trim())
      .filter(Boolean);
  }
  if (filters.initiativen?.length) {
    params['f.initiative'] = filters.initiativen;
  }
  if (filters.dateStart) {
    params['f.datum.start'] = filters.dateStart;
  }
  if (filters.dateEnd) {
    params['f.datum.end'] = filters.dateEnd;
  }
  if (filters.persons?.length) {
    const personIds = filters.persons
      .map((person) => Number.parseInt(person.id, 10))
      .filter((value) => !Number.isNaN(value));
    if (personIds.length) {
      params['f.person_id'] = personIds;
    }
  }
  return params;
};

const createMetadataOverview = (document) => {
  const entries = [];
  if (document.titel) entries.push({ label: 'Titel', value: document.titel });
  if (document.vorgangstyp) entries.push({ label: 'Vorgangstyp', value: document.vorgangstyp });
  if (document.drucksachetyp) entries.push({ label: 'Drucksachetyp', value: document.drucksachetyp });
  if (document.aktivitaetsart) entries.push({ label: 'Aktivitätsart', value: document.aktivitaetsart });
  if (document.datum) entries.push({ label: 'Datum', value: document.datum });
  if (document.wahlperiode) entries.push({ label: 'Wahlperiode', value: Array.isArray(document.wahlperiode) ? document.wahlperiode.join(', ') : document.wahlperiode });
  if (document.herausgeber) entries.push({ label: 'Herausgeber', value: document.herausgeber });
  if (document.initiative) entries.push({ label: 'Initiative', value: Array.isArray(document.initiative) ? document.initiative.join(', ') : document.initiative });
  if (document.deskriptor) entries.push({ label: 'Deskriptoren', value: Array.isArray(document.deskriptor) ? document.deskriptor.map((item) => (item.name ?? item)).join(', ') : document.deskriptor });
  if (document.abstract) entries.push({ label: 'Abstract', value: document.abstract });
  return entries;
};

const resolveTextContent = (document) => {
  if (document.text) return document.text;
  if (document.abstract) return document.abstract;
  if (document.aktivitaet_anzeige) {
    return document.aktivitaet_anzeige.map((item) => `${item.aktivitaetsart}: ${item.titel}`).join('\n');
  }
  return JSON.stringify(document, null, 2);
};

const formatDateTime = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;
  return parsed.format('DD.MM.YYYY HH:mm');
};

const SourceLinks = ({ document }) => {
  const fundstelle = document.fundstelle;
  const pdfUrl = fundstelle?.pdf_url ?? document.pdf_url;
  const xmlUrl = fundstelle?.xml_url ?? document.xml_url;

  if (!pdfUrl && !xmlUrl) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
      {pdfUrl ? (
        <Button
          component="a"
          href={pdfUrl}
          target="_blank"
          rel="noopener"
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon />}
        >
          PDF öffnen
        </Button>
      ) : null}
      {xmlUrl ? (
        <Button
          component="a"
          href={xmlUrl}
          target="_blank"
          rel="noopener"
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon />}
        >
          XML öffnen
        </Button>
      ) : null}
    </Stack>
  );
};

const BundestagSearch = ({ defaultDataset = 'vorgang', defaultFilters }) => {
  const [dataset, setDataset] = useState(defaultDataset);
  const [filters, setFilters] = useState(() => createInitialFilters(defaultFilters));
  const [results, setResults] = useState({ documents: [], cursor: null, numFound: 0, queryParams: null });
  const [personQuery, setPersonQuery] = useState('');
  const [personOptions, setPersonOptions] = useState([]);
  const [personLoading, setPersonLoading] = useState(false);

  const { data: metadata, isLoading: metadataLoading, error: metadataError, refetch: refetchMetadata } = useQuery({
    queryKey: ['bundestag-options'],
    queryFn: fetchMetadataOptions,
    staleTime: 1000 * 60 * 30,
  });

  useEffect(() => {
    setDataset(defaultDataset);
  }, [defaultDataset]);

  useEffect(() => {
    setFilters(createInitialFilters(defaultFilters));
  }, [defaultFilters]);

  useEffect(() => {
    if (!personQuery || personQuery.trim().length < 2) {
      setPersonLoading(false);
      return undefined;
    }
    const handle = setTimeout(async () => {
      setPersonLoading(true);
      try {
        const data = await searchPersons({ query: personQuery.trim() });
        setPersonOptions(data.options ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setPersonLoading(false);
      }
    }, 350);

    return () => clearTimeout(handle);
  }, [personQuery]);

  const setSelectedContent = useAppStore((state) => state.setSelectedContent);

  const mutation = useMutation({
    mutationFn: searchDataset,
  });

  const wahlperiodeOptions = metadata?.wahlperioden ?? [];
  const vorgangstypOptions = metadata?.vorgangstypen ?? [];
  const initiativeOptions = metadata?.initiativen ?? [];
  const combinedPersonOptions = useMemo(() => {
    const collection = new Map();
    (personOptions ?? []).forEach((option) => {
      if (option?.id && !collection.has(option.id)) {
        collection.set(option.id, option);
      }
    });
    (filters.persons ?? []).forEach((option) => {
      if (option?.id && !collection.has(option.id)) {
        collection.set(option.id, option);
      }
    });
    return Array.from(collection.values());
  }, [personOptions, filters.persons]);

  const handleSearch = async () => {
    const params = buildParams(filters);
    setResults({ documents: [], cursor: null, numFound: 0, queryParams: params });
    try {
      const data = await mutation.mutateAsync({ dataset, params });
      setResults({
        documents: data.documents ?? [],
        cursor: data.cursor ?? null,
        numFound: data.numFound ?? 0,
        queryParams: params,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleLoadMore = async () => {
    if (!results.cursor) return;
    try {
      const data = await mutation.mutateAsync({
        dataset,
        params: { ...results.queryParams, cursor: results.cursor },
      });
      setResults((prev) => ({
        documents: [...prev.documents, ...(data.documents ?? [])],
        cursor: data.cursor ?? null,
        numFound: data.numFound ?? prev.numFound,
        queryParams: prev.queryParams,
      }));
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetFilters = () => {
    setFilters(createInitialFilters(defaultFilters));
    setPersonQuery('');
  };

  const queryInProgress = mutation.isPending;
  const error = mutation.error;

  const hasResults = results.documents.length > 0;

  const resultInfo = useMemo(() => {
    if (!hasResults) return null;
    return `Gefundene Dokumente: ${results.documents.length}${results.numFound ? ` von ${results.numFound}` : ''}`;
  }, [hasResults, results.documents.length, results.numFound]);

  return (
    <Stack spacing={3}>
      <Paper elevation={1} sx={{ p: 3 }}>
        <Stack spacing={2}>
          <Typography variant="h6">Filtersuche im DIP</Typography>
          {metadataLoading ? <LinearProgress /> : null}
          {metadataError ? (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" size="small" onClick={() => refetchMetadata()}>
                  Erneut laden
                </Button>
              }
            >
              Konnte Filteroptionen nicht laden: {metadataError.message}
            </Alert>
          ) : null}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                label="Datensatz"
                fullWidth
                value={dataset}
                onChange={(event) => setDataset(event.target.value)}
              >
                {datasetOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 8 }}>
              <TextField
                label="Titel / Schlagwort (mit ; trennen)"
                fullWidth
                value={filters.title}
                onChange={(event) => setFilters((prev) => ({ ...prev, title: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                multiple
                options={wahlperiodeOptions}
                value={filters.wahlperioden}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, wahlperioden: value }))}
                disableCloseOnSelect
                loading={metadataLoading}
                isOptionEqualToValue={(option, value) => option === value}
                getOptionLabel={(option) => `Wahlperiode ${option}`}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Wahlperioden"
                    placeholder="Aus Liste wählen"
                    helperText="Mehrfachauswahl möglich"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                multiple
                freeSolo
                options={vorgangstypOptions}
                value={filters.vorgangstypen}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, vorgangstypen: value }))}
                filterSelectedOptions
                loading={metadataLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vorgangstypen"
                    placeholder="Filter auswählen oder tippen"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                multiple
                freeSolo
                options={initiativeOptions}
                value={filters.initiativen}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, initiativen: value }))}
                filterSelectedOptions
                loading={metadataLoading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Initiativen"
                    placeholder="Aus Liste wählen oder tippen"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                label="Deskriptoren (mit ; trennen)"
                fullWidth
                value={filters.deskriptor}
                onChange={(event) => setFilters((prev) => ({ ...prev, deskriptor: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                multiple
                options={combinedPersonOptions}
                value={filters.persons}
                onChange={(_, value) => setFilters((prev) => ({ ...prev, persons: value }))}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                getOptionLabel={(option) => option.title || `Person ${option.id}`}
                loading={personLoading}
                onInputChange={(_, value) => setPersonQuery(value)}
                filterOptions={(options) => options}
                renderOption={(props, option) => (
                  <li {...props} key={option.id}>
                    <Stack spacing={0}>
                      <Typography variant="body2">{option.title || option.id}</Typography>
                      {option.fraktion || option.funktion ? (
                        <Typography variant="caption" color="text.secondary">
                          {[option.fraktion, option.funktion].filter(Boolean).join(' • ')}
                        </Typography>
                      ) : null}
                    </Stack>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Personen (mind. 2 Zeichen)"
                    placeholder="Suchen und auswählen"
                    helperText="Ergebnisse werden live geladen"
                  />
                )}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField
                type="date"
                label="Datum ab"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={filters.dateStart}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateStart: event.target.value }))}
              />
            </Grid>
            <Grid size={{ xs: 6, md: 4 }}>
              <TextField
                type="date"
                label="Datum bis"
                InputLabelProps={{ shrink: true }}
                fullWidth
                value={filters.dateEnd}
                onChange={(event) => setFilters((prev) => ({ ...prev, dateEnd: event.target.value }))}
              />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Tooltip title="Filter zurücksetzen">
              <span>
                <IconButton onClick={handleResetFilters} disabled={queryInProgress}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={queryInProgress}
            >
              Suchen
            </Button>
          </Stack>
          {queryInProgress ? (
            <Stack alignItems="center" sx={{ py: 2 }}>
              <CircularProgress />
            </Stack>
          ) : null}
          {error ? <Alert severity="error">{error.message}</Alert> : null}
          {resultInfo ? <Chip label={resultInfo} color="primary" variant="outlined" /> : null}
        </Stack>
      </Paper>

      {hasResults ? (
        <Stack spacing={2}>
          {results.documents.map((document) => {
            const metadata = createMetadataOverview(document);
            const updated = document.aktualisiert ? formatDateTime(document.aktualisiert) : null;
            return (
              <Accordion key={`${document.id}-${document.dokumentnummer ?? ''}`} defaultExpanded={false}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {document.titel ?? document.vorgangsposition ?? 'Ohne Titel'}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      {document.vorgangstyp ? <Chip size="small" label={document.vorgangstyp} /> : null}
                      {document.dokumentart ? <Chip size="small" label={document.dokumentart} /> : null}
                      {document.drucksachetyp ? <Chip size="small" label={document.drucksachetyp} /> : null}
                      {document.aktivitaetsart ? <Chip size="small" label={document.aktivitaetsart} /> : null}
                      {document.wahlperiode ? (
                        <Chip size="small" label={`WP ${Array.isArray(document.wahlperiode) ? document.wahlperiode.join(', ') : document.wahlperiode}`} />
                      ) : null}
                      {document.datum ? (
                        <Chip size="small" label={dayjs(document.datum).isValid() ? dayjs(document.datum).format('DD.MM.YYYY') : document.datum} />
                      ) : null}
                      {updated ? <Chip size="small" label={`Aktualisiert ${updated}`} /> : null}
                    </Stack>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    <Stack spacing={1}>
                      {metadata.map((entry) => (
                        <Box key={entry.label}>
                          <Typography variant="subtitle2" color="text.secondary">
                            {entry.label}
                          </Typography>
                          <Typography variant="body2">{entry.value}</Typography>
                        </Box>
                      ))}
                    </Stack>
                    <SourceLinks document={document} />
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="contained"
                        startIcon={<SummarizeIcon />}
                        onClick={() =>
                          setSelectedContent({
                            title: document.titel ?? document.vorgangsposition ?? 'Ausgewählter Eintrag',
                            text: resolveTextContent(document),
                            metadata: document,
                          })
                        }
                      >
                        Für Gemini übernehmen
                      </Button>
                    </Stack>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            );
          })}
          {results.cursor ? (
            <Button variant="outlined" onClick={handleLoadMore} disabled={queryInProgress}>
              Weitere Ergebnisse laden
            </Button>
          ) : null}
        </Stack>
      ) : null}
    </Stack>
  );
};

export default BundestagSearch;
