import type { Translation } from "@helpwave/internationalization";

export type AppLocale = "de-DE" | "en-US";

export type AppTranslationEntries = {
  appName: string;
  addJob: string;
  settings: string;
  backToJobs: string;
  selectJob: string;
  name: string;
  model: string;
  language: string;
  participants: string;
  participantsPlaceholder: string;
  created: string;
  expires: string;
  neverExpires: string;
  auto: string;
  download: string;
  delete: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: (values: { name: string }) => string;
  cancel: string;
  create: string;
  createJob: string;
  createJobDescription: string;
  noWorkers: string;
  browseFiles: string;
  addMoreFiles: string;
  dropAudioHere: string;
  dropAudioHint: string;
  applyToAll: string;
  remove: string;
  file: string;
  jobName: string;
  jobNameTaken: string;
  statusPending: string;
  statusRunning: string;
  statusFinished: string;
  statusFailed: string;
  alertJobCreated: string;
  alertCreateFailed: string;
  alertDuplicateFiles: (values: { names: string }) => string;
  alertJobDeleted: string;
  alertDeleteFailed: string;
  alertDownloadFailed: string;
  alertShareUpdated: string;
  alertShareFailed: string;
  alertCopied: string;
  alertSettingsSaved: string;
  alertSettingsFailed: string;
  settingsTitle: string;
  settingsDescription: string;
  themeSection: string;
  themeSectionDescription: string;
  languageSection: string;
  languageSectionDescription: string;
  apiKeysSection: string;
  apiKeysSectionDescription: string;
  notificationsSection: string;
  notificationsSectionDescription: string;
  notifyEmail: string;
  notifyOnFinish: string;
  notifyOnFail: string;
  notifyMe: string;
  save: string;
  keyName: string;
  createKey: string;
  revoke: string;
  copyToken: string;
  tokenShownOnce: string;
  keyCreated: (values: { date: string }) => string;
  apiUsageTitle: string;
  apiMcpEndpoint: string;
  apiMcpConfig: string;
  apiCurlExamples: string;
  apiMcpTools: string;
  system: string;
  signInTitle: string;
  signInDescription: string;
  signInButton: (values: { provider: string }) => string;
  signInErrorReach: string;
  logoutSection: string;
  logoutSectionDescription: string;
  logout: string;
  signInErrorGeneric: (values: { error: string }) => string;
  loading: string;
  languageAuto: string;
  languageDe: string;
  languageEn: string;
  share: string;
  shareTitle: string;
  shareDescription: string;
  visibilityPrivate: string;
  visibilityPrivateHint: string;
  visibilityAuthenticated: string;
  visibilityAuthenticatedHint: string;
  visibilityPublic: string;
  visibilityPublicHint: string;
  copyLink: string;
  transcriptPreview: string;
  noTranscriptYet: string;
  files: string;
  filesDescription: string;
  details: string;
  jobNotFound: string;
};

export const appTranslation: Translation<AppLocale, AppTranslationEntries> = {
  "en-US": {
    appName: "Shoutout",
    addJob: "Add job",
    settings: "Settings",
    backToJobs: "Back to jobs",
    selectJob: "Select a job or create a new one.",
    name: "Name",
    model: "Model",
    language: "Language",
    participants: "Speakers",
    participantsPlaceholder: "Speaker count (auto)",
    created: "Created",
    expires: "Expires",
    neverExpires: "Never",
    auto: "Auto",
    download: "Download",
    delete: "Delete",
    deleteConfirmTitle: "Delete job?",
    deleteConfirmDescription: ({ name }) =>
      `Delete “${name}”? This cannot be undone.`,
    cancel: "Cancel",
    create: "Create",
    createJob: "Create job",
    createJobDescription:
      "Upload one or more audio files into a single job.",
    noWorkers: "No workers attached. Attach a worker to choose a model.",
    browseFiles: "Browse files",
    addMoreFiles: "Add more files",
    dropAudioHere: "Drop audio files here",
    dropAudioHint: "or click to browse. Multiple files stay in one job.",
    applyToAll: "Apply to all",
    remove: "Remove",
    file: "File",
    jobName: "Job name",
    jobNameTaken: "A job with this name already exists.",
    statusPending: "Pending",
    statusRunning: "Running",
    statusFinished: "Finished",
    statusFailed: "Failed",
    alertJobCreated: "Job created",
    alertCreateFailed: "Could not create job",
    alertDuplicateFiles: ({ names }) =>
      `Skipped duplicate file name(s): ${names}`,
    alertJobDeleted: "Job deleted",
    alertDeleteFailed: "Delete failed",
    alertDownloadFailed: "Download failed",
    alertShareUpdated: "Sharing updated",
    alertShareFailed: "Could not update sharing",
    alertCopied: "Link copied",
    alertSettingsSaved: "Settings saved",
    alertSettingsFailed: "Could not save settings",
    settingsTitle: "Settings",
    settingsDescription: "Theme, language, mailing, and API keys for your account.",
    themeSection: "Theme",
    themeSectionDescription: "Choose light, dark, or follow your system.",
    languageSection: "Language",
    languageSectionDescription:
      "Choose German, English, or follow your system.",
    apiKeysSection: "API keys",
    apiKeysSectionDescription:
      "Use the same bearer token for REST and MCP. The secret is shown only once.",
    notificationsSection: "Mailing options",
    notificationsSectionDescription:
      "Choose when Shoutout emails you about your jobs.",
    notifyEmail: "Notification email",
    notifyOnFinish: "Email when a job finishes",
    notifyOnFail: "Email when a job fails",
    notifyMe: "Notify me by email",
    save: "Save",
    keyName: "Key name",
    createKey: "Create",
    revoke: "Revoke",
    copyToken: "Copy",
    tokenShownOnce: "Copy this token now. It will not be shown again.",
    keyCreated: ({ date }) => `created ${date}`,
    apiUsageTitle: "How to use",
    apiMcpEndpoint: "MCP endpoint",
    apiMcpConfig: "MCP client config",
    apiCurlExamples: "REST (curl)",
    apiMcpTools:
      "Tools: list_languages, list_models, request_upload, create_job, create_jobs_bulk, list_jobs, get_job, delete_job, download_job_result.",
    system: "System",
    signInTitle: "Shoutout",
    signInDescription:
      "Sign in to create transcription jobs and manage API keys.",
    signInButton: ({ provider }) => `Sign in with ${provider}`,
    signInErrorReach:
      "Could not reach the sign-in service. Check that it is running and the sign-in URLs are correct.",
    logoutSection: "Session",
    logoutSectionDescription: "End your session on this browser.",
    logout: "Log out",
    signInErrorGeneric: ({ error }) => `Sign-in failed (${error}).`,
    loading: "Loading…",
    languageAuto: "Auto",
    languageDe: "DE",
    languageEn: "EN",
    share: "Share",
    shareTitle: "Share job",
    shareDescription: "Choose who can open this job via its link.",
    visibilityPrivate: "Private",
    visibilityPrivateHint: "Only you can open this job.",
    visibilityAuthenticated: "Signed-in users",
    visibilityAuthenticatedHint:
      "Anyone signed in who has the link can view it.",
    visibilityPublic: "Public",
    visibilityPublicHint: "Anyone with the link can view it.",
    copyLink: "Copy link",
    transcriptPreview: "Transcript",
    noTranscriptYet: "Transcript will appear here when the job finishes.",
    files: "Files",
    filesDescription:
      "Each uploaded audio file has its own preview. Select a file to play and read its transcript.",
    details: "Details",
    jobNotFound: "Job not found or you do not have access.",
  },
  "de-DE": {
    appName: "Shoutout",
    addJob: "Job hinzufügen",
    settings: "Einstellungen",
    backToJobs: "Zurück zu Jobs",
    selectJob: "Wähle einen Job aus oder erstelle einen neuen.",
    name: "Name",
    model: "Modell",
    language: "Sprache",
    participants: "Sprecher",
    participantsPlaceholder: "Sprecheranzahl (auto)",
    created: "Erstellt",
    expires: "Läuft ab",
    neverExpires: "Nie",
    auto: "Auto",
    download: "Herunterladen",
    delete: "Löschen",
    deleteConfirmTitle: "Job löschen?",
    deleteConfirmDescription: ({ name }) =>
      `„${name}“ wirklich löschen? Das kann nicht rückgängig gemacht werden.`,
    cancel: "Abbrechen",
    create: "Erstellen",
    createJob: "Job erstellen",
    createJobDescription:
      "Lade eine oder mehrere Audio-Dateien in einen Job hoch.",
    noWorkers:
      "Keine Worker verbunden. Verbinde einen Worker, um ein Modell zu wählen.",
    browseFiles: "Dateien auswählen",
    addMoreFiles: "Weitere Dateien hinzufügen",
    dropAudioHere: "Audio-Dateien hier ablegen",
    dropAudioHint:
      "oder klicken zum Auswählen. Mehrere Dateien bleiben ein Job.",
    applyToAll: "Für alle setzen",
    remove: "Entfernen",
    file: "Datei",
    jobName: "Jobname",
    jobNameTaken: "Ein Job mit diesem Namen existiert bereits.",
    statusPending: "Wartend",
    statusRunning: "Läuft",
    statusFinished: "Fertig",
    statusFailed: "Fehlgeschlagen",
    alertJobCreated: "Job erstellt",
    alertCreateFailed: "Job konnte nicht erstellt werden",
    alertDuplicateFiles: ({ names }) =>
      `Doppelte Dateiname(n) übersprungen: ${names}`,
    alertJobDeleted: "Job gelöscht",
    alertDeleteFailed: "Löschen fehlgeschlagen",
    alertDownloadFailed: "Download fehlgeschlagen",
    alertShareUpdated: "Freigabe aktualisiert",
    alertShareFailed: "Freigabe konnte nicht aktualisiert werden",
    alertCopied: "Link kopiert",
    alertSettingsSaved: "Einstellungen gespeichert",
    alertSettingsFailed: "Einstellungen konnten nicht gespeichert werden",
    settingsTitle: "Einstellungen",
    settingsDescription:
      "Theme, Sprache, Benachrichtigungen und API-Keys für deinen Account.",
    themeSection: "Theme",
    themeSectionDescription:
      "Wähle Hell, Dunkel oder folge dem System.",
    languageSection: "Sprache",
    languageSectionDescription:
      "Wähle Deutsch, Englisch oder folge dem System.",
    apiKeysSection: "API-Keys",
    apiKeysSectionDescription:
      "Derselbe Bearer-Token gilt für REST und MCP. Das Geheimnis wird nur einmal angezeigt.",
    notificationsSection: "E-Mail-Optionen",
    notificationsSectionDescription:
      "Lege fest, wann Shoutout dich über Jobs benachrichtigt.",
    notifyEmail: "Benachrichtigungs-E-Mail",
    notifyOnFinish: "E-Mail wenn ein Job fertig ist",
    notifyOnFail: "E-Mail wenn ein Job fehlschlägt",
    notifyMe: "Per E-Mail benachrichtigen",
    save: "Speichern",
    keyName: "Key-Name",
    createKey: "Erstellen",
    revoke: "Widerrufen",
    copyToken: "Kopieren",
    tokenShownOnce:
      "Kopiere diesen Token jetzt. Er wird nicht erneut angezeigt.",
    keyCreated: ({ date }) => `erstellt ${date}`,
    apiUsageTitle: "So verwendest du den Key",
    apiMcpEndpoint: "MCP-Endpoint",
    apiMcpConfig: "MCP-Client-Konfiguration",
    apiCurlExamples: "REST (curl)",
    apiMcpTools:
      "Tools: list_languages, list_models, request_upload, create_job, create_jobs_bulk, list_jobs, get_job, delete_job, download_job_result.",
    system: "System",
    signInTitle: "Shoutout",
    signInDescription:
      "Melde dich an, um Transkriptionsjobs zu erstellen und API-Keys zu verwalten.",
    signInButton: ({ provider }) => `Mit ${provider} anmelden`,
    signInErrorReach:
      "Anmeldedienst nicht erreichbar. Prüfe, ob er läuft und die Anmelde-URLs stimmen.",
    logoutSection: "Sitzung",
    logoutSectionDescription: "Beende deine Sitzung in diesem Browser.",
    logout: "Abmelden",
    signInErrorGeneric: ({ error }) => `Anmeldung fehlgeschlagen (${error}).`,
    loading: "Laden…",
    languageAuto: "Auto",
    languageDe: "DE",
    languageEn: "EN",
    share: "Teilen",
    shareTitle: "Job teilen",
    shareDescription: "Lege fest, wer diesen Job über den Link öffnen darf.",
    visibilityPrivate: "Privat",
    visibilityPrivateHint: "Nur du kannst diesen Job öffnen.",
    visibilityAuthenticated: "Angemeldete Nutzer",
    visibilityAuthenticatedHint:
      "Jeder Angemeldete mit dem Link kann ihn ansehen.",
    visibilityPublic: "Öffentlich",
    visibilityPublicHint: "Jeder mit dem Link kann ihn ansehen.",
    copyLink: "Link kopieren",
    transcriptPreview: "Transkript",
    noTranscriptYet:
      "Das Transkript erscheint hier, sobald der Job fertig ist.",
    files: "Dateien",
    filesDescription:
      "Jede hochgeladene Audiodatei hat eine eigene Vorschau. Wähle eine Datei zum Abspielen und Lesen des Transkripts.",
    details: "Details",
    jobNotFound: "Job nicht gefunden oder kein Zugriff.",
  },
};
