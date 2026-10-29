{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.shoutout-worker;
in
{
  options.services.shoutout-worker = {
    enable = lib.mkEnableOption "shoutout transcription worker";
    packageSource = lib.mkOption {
      type = lib.types.path;
      default = ../..;
    };
    package = lib.mkOption {
      type = lib.types.package;
      default = pkgs.callPackage ../packages/worker.nix {
        self = cfg.packageSource;
        cudaSupport = cfg.cuda;
      };
    };
    cuda = lib.mkEnableOption "CUDA-enabled worker package";
    dashboardUrl = lib.mkOption {
      type = lib.types.str;
      example = "https://shoutout.example.com";
    };
    enrollmentTokenFile = lib.mkOption { type = lib.types.path; };
    huggingfaceTokenFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
    };
    whisperModels = lib.mkOption {
      type = lib.types.listOf lib.types.str;
      default = [ "small" ];
    };
    concurrency = lib.mkOption {
      type = lib.types.ints.positive;
      default = 1;
    };
    workerName = lib.mkOption {
      type = lib.types.str;
      default = "shoutout-worker";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services.shoutout-worker = {
      description = "shoutout worker";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        DynamicUser = true;
        StateDirectory = "shoutout-worker";
        CacheDirectory = "shoutout-worker";
        LoadCredential = [
          "enrollment_token:${cfg.enrollmentTokenFile}"
        ]
        ++ lib.optional (cfg.huggingfaceTokenFile != null) "hf_token:${cfg.huggingfaceTokenFile}";
        DeviceAllow = lib.mkIf cfg.cuda [ "char-nvidia-uvm rwm" "char-nvidia-frontend rwm" ];
        SupplementaryGroups = lib.mkIf cfg.cuda [ "video" ];
        ExecStart = pkgs.writeShellScript "shoutout-worker-start" ''
          set -eu
          export DASHBOARD_URL=${lib.escapeShellArg cfg.dashboardUrl}
          export WORKER_NAME=${lib.escapeShellArg cfg.workerName}
          export WHISPER_MODELS=${lib.escapeShellArg (lib.concatStringsSep "," cfg.whisperModels)}
          export CONCURRENCY=${toString cfg.concurrency}
          export HF_HOME="$CACHE_DIRECTORY"
          export WORKER_ENROLLMENT_TOKEN="$(cat "$CREDENTIALS_DIRECTORY/enrollment_token")"
          if [ -f "$CREDENTIALS_DIRECTORY/hf_token" ]; then
            export HUGGINGFACE_TOKEN="$(cat "$CREDENTIALS_DIRECTORY/hf_token")"
          fi
          exec ${cfg.package}/bin/shoutout-worker
        '';
        Restart = "always";
        RestartSec = "5s";
      };
    };
  };
}
