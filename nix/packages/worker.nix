{
  lib,
  python3Packages,
  ffmpeg,
  cudaSupport ? false,
  self,
}:

let
  pythonPackages =
    if cudaSupport then
      (python3Packages.python.override {
        packageOverrides = final: prev: {
          torch = prev.torch.override { cudaSupport = true; };
          torchaudio = prev.torchaudio.override {
            cudaSupport = true;
            torch = final.torch;
          };
        };
      }).pkgs
    else
      python3Packages;
in
pythonPackages.buildPythonApplication {
  pname = if cudaSupport then "shoutout-worker-cuda" else "shoutout-worker";
  version = "0.2.0";
  format = "pyproject";

  src = self + "/worker";

  propagatedBuildInputs = with pythonPackages; [
    httpx
    numpy
    openai-whisper
    pandas
    pyannote-audio
    pydantic
    pydantic-settings
    python-dotenv
    torch
    torchaudio
    typing-extensions
    urllib3
  ];

  makeWrapperArgs = [
    "--prefix"
    "PATH"
    ":"
    (lib.makeBinPath [ ffmpeg ])
  ];

  doCheck = false;

  meta = {
    description = "Shoutout transcription worker";
    license = lib.licenses.gpl3Only;
    platforms = lib.platforms.linux;
  };
}
