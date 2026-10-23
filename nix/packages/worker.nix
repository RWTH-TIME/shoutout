{
  lib,
  python3Packages,
  ffmpeg,
  cudaSupport ? false,
  self,
}:

python3Packages.buildPythonApplication {
  pname = if cudaSupport then "shoutout-worker-cuda" else "shoutout-worker";
  version = "0.2.0";
  format = "pyproject";

  src = self + "/worker";

  propagatedBuildInputs = with python3Packages; [
    httpx
    numpy
    pandas
    pydantic
    pydantic-settings
    python-dotenv
    torch
    torchaudio
    typing-extensions
    urllib3
  ];

  makeWrapperArgs = [
    "--prefix PATH : ${lib.makeBinPath [ ffmpeg ]}"
  ];

  doCheck = false;

  meta = with lib; {
    description = "Shoutout transcription worker";
    license = licenses.gpl3Only;
    platforms = platforms.linux;
  };
}
