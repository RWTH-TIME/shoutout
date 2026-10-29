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
  modelInfoLabel: string;
  modelInfoTurbo: string;
  modelInfoLarge: string;
  modelInfoMedium: string;
  modelInfoSmall: string;
  modelInfoBase: string;
  modelInfoTiny: string;
  modelInfoOther: string;
  modelInfoEnglishOnly: string;
  modelInfoDialogTitle: string;
  modelInfoDialogDescription: string;
  modelInfoTableDetails: string;
  modelInfoTableWorkers: string;
  modelInfoWorkersHint: string;
  modelEnglishOnlyShort: string;
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
  stop: string;
  stopConfirmTitle: string;
  stopConfirmDescription: (values: { name: string }) => string;
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
  statusCancelled: string;
  alertJobCreated: string;
  alertCreateFailed: string;
  alertDuplicateFiles: (values: { names: string }) => string;
  alertJobDeleted: string;
  alertDeleteFailed: string;
  alertJobStopped: string;
  alertStopFailed: string;
  alertDownloadFailed: string;
  alertShareUpdated: string;
  alertShareFailed: string;
  alertCopied: string;
  alertSettingsSaved: string;
  alertSettingsFailed: string;
  settingsTitle: string;
  settingsDescription: string;
  settingsDescriptionWithoutMail: string;
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
  notFoundTitle: string;
  notFoundDescription: string;
  manageSpeakers: string;
  manageSpeakersDescription: string;
  speakerMergeWarningTitle: string;
  speakerMergeWarningDescription: (values: {
    count: number;
    name: string;
  }) => string;
  saveSpeakerNames: string;
  alertSpeakerNamesSaved: string;
  alertSpeakerNamesFailed: string;
  statisticsTitle: string;
  speakersDetected: string;
  totalWords: string;
  totalCharacters: string;
  wordsLabel: string;
  charsLabel: string;
  exportPdf: string;
  alertPdfFailed: string;
};

export const appTranslation: Translation<AppLocale, AppTranslationEntries> = {
  "en-US": {
    appName: "shoutout",
    addJob: "Add job",
    settings: "Settings",
    backToJobs: "Back to jobs",
    selectJob: "Select a job or create a new one.",
    name: "Name",
    model: "Model",
    modelInfoLabel: "View available models",
    modelInfoTurbo:
      "Recommended. Almost as accurate as large, and much faster.",
    modelInfoLarge: "Most accurate, and the slowest.",
    modelInfoMedium: "Good accuracy at a moderate speed.",
    modelInfoSmall: "Faster than medium, with less accuracy on hard audio.",
    modelInfoBase: "Fast, with clearly lower accuracy.",
    modelInfoTiny: "Fastest, and the least accurate. Useful for a quick draft.",
    modelInfoOther: "Whisper model offered by the connected workers.",
    modelInfoEnglishOnly: "This variant only understands English.",
    modelInfoDialogTitle: "Available models",
    modelInfoDialogDescription:
      "Compare speed, accuracy, and worker availability for the models connected to your workers.",
    modelInfoTableDetails: "Details",
    modelInfoTableWorkers: "Workers",
    modelInfoWorkersHint:
      "The number behind a model is how many connected workers can run it right now. More workers mean jobs using that model start sooner.",
    modelEnglishOnlyShort: "EN only",
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
    stop: "Stop",
    stopConfirmTitle: "Stop job?",
    stopConfirmDescription: ({ name }) =>
      `Stop “${name}”? Progress made so far will be lost.`,
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
    statusCancelled: "Cancelled",
    alertJobCreated: "Job created",
    alertCreateFailed: "Could not create job",
    alertDuplicateFiles: ({ names }) =>
      `Skipped duplicate file name(s): ${names}`,
    alertJobDeleted: "Job deleted",
    alertDeleteFailed: "Delete failed",
    alertJobStopped: "Job stopped",
    alertStopFailed: "Stop failed",
    alertDownloadFailed: "Download failed",
    alertShareUpdated: "Sharing updated",
    alertShareFailed: "Could not update sharing",
    alertCopied: "Link copied",
    alertSettingsSaved: "Settings saved",
    alertSettingsFailed: "Could not save settings",
    settingsTitle: "Settings",
    settingsDescription: "Theme, language, mailing, and API keys for your account.",
    settingsDescriptionWithoutMail:
      "Theme, language, and API keys for your account.",
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
      "Choose when shoutout emails you about your jobs.",
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
    signInTitle: "shoutout",
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
    notFoundTitle: "Page not found",
    notFoundDescription: "The page you are looking for does not exist.",
    manageSpeakers: "Manage speakers",
    manageSpeakersDescription:
      "Rename diarized speakers for this transcript. Using the same name for multiple speakers merges them.",
    speakerMergeWarningTitle: "Merge speakers?",
    speakerMergeWarningDescription: ({ count, name }) =>
      `You are about to merge ${count} speakers into “${name}”. Continue?`,
    saveSpeakerNames: "Save names",
    alertSpeakerNamesSaved: "Speaker names saved",
    alertSpeakerNamesFailed: "Could not save speaker names",
    statisticsTitle: "Statistics",
    speakersDetected: "Speakers detected",
    totalWords: "Total words",
    totalCharacters: "Total characters",
    wordsLabel: "words",
    charsLabel: "chars",
    exportPdf: "Export PDF",
    alertPdfFailed: "Could not open PDF",
  },
  "de-DE": {
    appName: "shoutout",
    addJob: "Job hinzufügen",
    settings: "Einstellungen",
    backToJobs: "Zurück zu Jobs",
    selectJob: "Wähle einen Job aus oder erstelle einen neuen.",
    name: "Name",
    model: "Modell",
    modelInfoLabel: "Verfügbare Modelle anzeigen",
    modelInfoTurbo:
      "Empfohlen. Fast so genau wie large, und deutlich schneller.",
    modelInfoLarge: "Am genauesten, und am langsamsten.",
    modelInfoMedium: "Gute Genauigkeit bei mittlerer Geschwindigkeit.",
    modelInfoSmall:
      "Schneller als medium, mit weniger Genauigkeit bei schwierigem Audio.",
    modelInfoBase: "Schnell, mit deutlich geringerer Genauigkeit.",
    modelInfoTiny:
      "Am schnellsten und am ungenauesten. Gut für einen schnellen Entwurf.",
    modelInfoOther: "Whisper-Modell der verbundenen Worker.",
    modelInfoEnglishOnly: "Diese Variante versteht nur Englisch.",
    modelInfoDialogTitle: "Verfügbare Modelle",
    modelInfoDialogDescription:
      "Vergleiche Geschwindigkeit, Genauigkeit und Worker-Verfügbarkeit der mit deinen Workern verbundenen Modelle.",
    modelInfoTableDetails: "Details",
    modelInfoTableWorkers: "Worker",
    modelInfoWorkersHint:
      "Die Zahl hinter einem Modell zeigt, wie viele verbundene Worker es gerade ausführen können. Mehr Worker heißt, Jobs mit diesem Modell starten schneller.",
    modelEnglishOnlyShort: "Nur EN",
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
    stop: "Stoppen",
    stopConfirmTitle: "Job stoppen?",
    stopConfirmDescription: ({ name }) =>
      `„${name}“ wirklich stoppen? Der bisherige Fortschritt geht verloren.`,
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
    statusCancelled: "Abgebrochen",
    alertJobCreated: "Job erstellt",
    alertCreateFailed: "Job konnte nicht erstellt werden",
    alertDuplicateFiles: ({ names }) =>
      `Doppelte Dateiname(n) übersprungen: ${names}`,
    alertJobDeleted: "Job gelöscht",
    alertDeleteFailed: "Löschen fehlgeschlagen",
    alertJobStopped: "Job gestoppt",
    alertStopFailed: "Stoppen fehlgeschlagen",
    alertDownloadFailed: "Download fehlgeschlagen",
    alertShareUpdated: "Freigabe aktualisiert",
    alertShareFailed: "Freigabe konnte nicht aktualisiert werden",
    alertCopied: "Link kopiert",
    alertSettingsSaved: "Einstellungen gespeichert",
    alertSettingsFailed: "Einstellungen konnten nicht gespeichert werden",
    settingsTitle: "Einstellungen",
    settingsDescription:
      "Theme, Sprache, Benachrichtigungen und API-Keys für deinen Account.",
    settingsDescriptionWithoutMail:
      "Theme, Sprache und API-Keys für deinen Account.",
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
      "Lege fest, wann shoutout dich über Jobs benachrichtigt.",
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
    signInTitle: "shoutout",
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
    notFoundTitle: "Seite nicht gefunden",
    notFoundDescription: "Die gesuchte Seite existiert nicht.",
    manageSpeakers: "Sprecher verwalten",
    manageSpeakersDescription:
      "Benenne erkannte Sprecher für dieses Transkript um. Derselbe Name für mehrere Sprecher führt zu einem Merge.",
    speakerMergeWarningTitle: "Sprecher zusammenführen?",
    speakerMergeWarningDescription: ({ count, name }) =>
      `Du bist dabei, ${count} Sprecher zu „${name}“ zusammenzuführen. Fortfahren?`,
    saveSpeakerNames: "Namen speichern",
    alertSpeakerNamesSaved: "Sprechernamen gespeichert",
    alertSpeakerNamesFailed: "Sprechernamen konnten nicht gespeichert werden",
    statisticsTitle: "Statistik",
    speakersDetected: "Erkannte Sprecher",
    totalWords: "Wörter gesamt",
    totalCharacters: "Zeichen gesamt",
    wordsLabel: "Wörter",
    charsLabel: "Zeichen",
    exportPdf: "PDF exportieren",
    alertPdfFailed: "PDF konnte nicht geöffnet werden",
  },
};
