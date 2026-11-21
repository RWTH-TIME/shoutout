export type MixerSourceId = string;

export type MixerSource = {
  id: MixerSourceId;
  stream: MediaStream;
  gain: GainNode;
  analyser: AnalyserNode;
};

export type AudioMixer = {
  destination: MediaStreamAudioDestinationNode;
  context: AudioContext;
  sources: Map<MixerSourceId, MixerSource>;
  setGain: (sourceId: MixerSourceId, value: number) => void;
  getAnalyser: (sourceId: MixerSourceId) => AnalyserNode | null;
  dispose: () => void;
};

export function createAudioMixer(
  inputs: Array<{ id: MixerSourceId; stream: MediaStream }>
): AudioMixer {
  const context = new AudioContext();
  const destination = context.createMediaStreamDestination();
  const sources = new Map<MixerSourceId, MixerSource>();

  for (const input of inputs) {
    if (input.stream.getAudioTracks().length === 0) {
      continue;
    }
    const sourceNode = context.createMediaStreamSource(input.stream);
    const gain = context.createGain();
    gain.gain.value = 1;
    const analyser = context.createAnalyser();
    analyser.fftSize = 256;
    sourceNode.connect(gain);
    gain.connect(analyser);
    gain.connect(destination);
    sources.set(input.id, {
      id: input.id,
      stream: input.stream,
      gain,
      analyser,
    });
  }

  if (context.state === "suspended") {
    void context.resume();
  }

  return {
    destination,
    context,
    sources,
    setGain(sourceId, value) {
      const source = sources.get(sourceId);
      if (!source) {
        return;
      }
      source.gain.gain.value = Math.max(0, Math.min(1, value));
    },
    getAnalyser(sourceId) {
      return sources.get(sourceId)?.analyser ?? null;
    },
    dispose() {
      Array.from(sources.values()).forEach((source) => {
        source.gain.disconnect();
        source.analyser.disconnect();
      });
      sources.clear();
      void context.close();
    },
  };
}
