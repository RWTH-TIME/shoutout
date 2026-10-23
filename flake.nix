{
  description = "Shoutout transcription system and worker";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    let
      systems = flake-utils.lib.eachDefaultSystem (
        system:
        let
          pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
          };
          dashboard = pkgs.callPackage ./nix/packages/dashboard.nix { inherit self; };
          worker = pkgs.callPackage ./nix/packages/worker.nix {
            inherit self;
            cudaSupport = false;
          };
          worker-cuda = pkgs.callPackage ./nix/packages/worker.nix {
            inherit self;
            cudaSupport = true;
          };
        in
        {
          packages = {
            inherit dashboard worker;
            worker-cuda = worker-cuda;
            default = dashboard;
          };
          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
              python313
              python313Packages.pip
              python313Packages.virtualenv
              ffmpeg
              prisma-engines
              openssl
              pkg-config
            ];
            shellHook = ''
              export PRISMA_QUERY_ENGINE_LIBRARY="${pkgs.prisma-engines}/lib/libquery_engine.node"
              export PRISMA_QUERY_ENGINE_BINARY="${pkgs.prisma-engines}/bin/query-engine"
              export PRISMA_SCHEMA_ENGINE_BINARY="${pkgs.prisma-engines}/bin/schema-engine"
              export PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
            '';
          };
          checks = {
            dashboard = dashboard;
            worker = worker;
          };
        }
      );
    in
    systems
    // {
      nixosModules.shoutout = import ./nix/modules/shoutout.nix;
      nixosModules.shoutout-worker = import ./nix/modules/shoutout-worker.nix;
      nixosModules.default = self.nixosModules.shoutout;
    };
}
