{
  lib,
  stdenv,
  fetchurl,
  nodejs_22,
  prisma-engines,
  makeWrapper,
  self,
}:

let
  src = self + "/dashboard";
in
stdenv.mkDerivation {
  pname = "shoutout-dashboard";
  version = "0.2.0";

  inherit src;

  nativeBuildInputs = [
    nodejs_22
    makeWrapper
  ];

  buildInputs = [ prisma-engines ];

  PRISMA_SCHEMA_ENGINE_BINARY = "${prisma-engines}/bin/schema-engine";
  PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING = "1";
  PRISMA_CLI_BINARY_TARGETS = "debian-openssl-3.0.x";

  buildPhase = ''
    export HOME=$TMPDIR
    npm ci
    npx prisma generate
    npm run build
  '';

  installPhase = ''
    mkdir -p $out/lib/shoutout-dashboard $out/bin
    cp -r .next/standalone/. $out/lib/shoutout-dashboard/
    mkdir -p $out/lib/shoutout-dashboard/.next
    cp -r .next/static $out/lib/shoutout-dashboard/.next/static
    cp -r prisma $out/lib/shoutout-dashboard/prisma
    cp prisma.config.ts $out/lib/shoutout-dashboard/
    cp -r scripts $out/lib/shoutout-dashboard/scripts
    cp package.json $out/lib/shoutout-dashboard/
    makeWrapper ${nodejs_22}/bin/node $out/bin/shoutout-dashboard \
      --set PRISMA_SCHEMA_ENGINE_BINARY "${prisma-engines}/bin/schema-engine" \
      --set PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING "1" \
      --run 'cd ${placeholder "out"}/lib/shoutout-dashboard && npx prisma migrate deploy' \
      --add-flags "$out/lib/shoutout-dashboard/server.js"
    makeWrapper ${nodejs_22}/bin/npx $out/bin/shoutout-cleanup \
      --set PRISMA_SCHEMA_ENGINE_BINARY "${prisma-engines}/bin/schema-engine" \
      --add-flags "tsx $out/lib/shoutout-dashboard/scripts/cleanup.ts"
  '';

  meta = with lib; {
    description = "Shoutout dashboard";
    license = licenses.gpl3Only;
    platforms = platforms.linux;
  };
}
