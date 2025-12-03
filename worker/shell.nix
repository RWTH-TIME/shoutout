{
  pkgs ? import <nixpkgs> { },
}:

let
  python = pkgs.python313;
in
pkgs.mkShell {
  buildInputs = [
    python
    python.pkgs.pip
    python.pkgs.virtualenv

    pkgs.gcc
    pkgs.stdenv.cc.cc.lib
    python.pkgs.numpy
  ];

  venvDir = "./venv";

  shellHook = ''
    echo ">>> Activating dev shell…"

    if [ ! -d "$venvDir" ]; then
      echo ">>> Creating virtual environment at $venvDir"
      python -m venv $venvDir
    fi

    source $venvDir/bin/activate
    echo ">>> venv active"

    export LD_LIBRARY_PATH="${pkgs.stdenv.cc.cc.lib}/lib:$LD_LIBRARY_PATH"

    if [ -f requirements.txt ]; then
      req_hash_file="$venvDir/.requirements_hash"
      current_hash=$(sha256sum requirements.txt | cut -d " " -f1)

      if [ ! -f "$req_hash_file" ] || [ "$(cat $req_hash_file)" != "$current_hash" ]; then
        echo ">>> Installing pip requirements..."
        pip install --upgrade pip > /dev/null
        pip install -r requirements.txt
        echo "$current_hash" > "$req_hash_file"
        echo ">>> Requirements installed"
      else
        echo ">>> Requirements unchanged"
      fi
    fi

    echo ">>> Done."
  '';
}
