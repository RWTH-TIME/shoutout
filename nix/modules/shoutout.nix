{
  config,
  lib,
  pkgs,
  ...
}:

let
  cfg = config.services.shoutout;
  shoutoutPkgs = pkgs.extend (
    _: _: {
      shoutout-dashboard =
        pkgs.callPackage ../packages/dashboard.nix { self = cfg.packageSource; };
    }
  );
in
{
  options.services.shoutout = {
    enable = lib.mkEnableOption "Shoutout dashboard system";
    packageSource = lib.mkOption {
      type = lib.types.path;
      default = ../..;
      description = "Path to the shoutout repository root.";
    };
    package = lib.mkOption {
      type = lib.types.package;
      default = shoutoutPkgs.shoutout-dashboard;
      description = "Dashboard package.";
    };
    port = lib.mkOption {
      type = lib.types.port;
      default = 8000;
    };
    url = lib.mkOption {
      type = lib.types.str;
      default = "http://localhost:8000";
    };
    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
    };
    oidc = {
      issuer = lib.mkOption { type = lib.types.str; };
      clientId = lib.mkOption { type = lib.types.str; default = "shoutout"; };
      clientSecretFile = lib.mkOption { type = lib.types.path; };
      displayName = lib.mkOption {
        type = lib.types.str;
        default = "Shoutout";
        description = "Identity provider name shown on the sign-in button.";
      };
    };
    nextauthSecretFile = lib.mkOption { type = lib.types.path; };
    workerEnrollmentTokenFile = lib.mkOption { type = lib.types.path; };
    database = {
      createLocally = lib.mkEnableOption "local PostgreSQL for Shoutout" // {
        default = true;
      };
      url = lib.mkOption {
        type = lib.types.str;
        default = "postgresql://shoutout@localhost/shoutout?host=/run/postgresql";
      };
    };
    garage = {
      enable = lib.mkEnableOption "local Garage S3" // { default = true; };
      endpoint = lib.mkOption {
        type = lib.types.str;
        default = "http://127.0.0.1:3900";
      };
      publicEndpoint = lib.mkOption {
        type = lib.types.str;
        default = "http://127.0.0.1:3900";
      };
      bucket = lib.mkOption {
        type = lib.types.str;
        default = "shoutout-job-bucket";
      };
      accessKeyFile = lib.mkOption { type = lib.types.path; };
      secretKeyFile = lib.mkOption { type = lib.types.path; };
    };
    jobExpirationDays = lib.mkOption {
      type = lib.types.int;
      default = 14;
      description = "Days until jobs expire. Set to 0 for no expiration.";
    };
    listmonk = {
      url = lib.mkOption {
        type = lib.types.str;
        default = "";
      };
      username = lib.mkOption {
        type = lib.types.str;
        default = "";
      };
      tokenFile = lib.mkOption {
        type = lib.types.nullOr lib.types.path;
        default = null;
      };
      templateId = lib.mkOption {
        type = lib.types.int;
        default = 0;
      };
    };
    keycloak.enable = lib.mkEnableOption "optional bundled Keycloak";
  };

  config = lib.mkIf cfg.enable {
    services.postgresql = lib.mkIf cfg.database.createLocally {
      enable = true;
      ensureDatabases = [ "shoutout" ];
      ensureUsers = [
        {
          name = "shoutout";
          ensureDBOwnership = true;
        }
      ];
    };

    services.garage = lib.mkIf cfg.garage.enable {
      enable = true;
      settings = {
        metadata_dir = "/var/lib/garage/meta";
        data_dir = "/var/lib/garage/data";
        db_engine = "sqlite";
        replication_factor = 1;
        rpc_bind_addr = "[::]:3901";
        s3_api = {
          s3_region = "garage";
          api_bind_addr = "[::]:3900";
        };
        admin = {
          api_bind_addr = "[::]:3903";
        };
      };
    };

    systemd.services.shoutout = {
      description = "Shoutout dashboard";
      after = [ "network-online.target" ] ++ lib.optional cfg.database.createLocally "postgresql.service";
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        DynamicUser = true;
        StateDirectory = "shoutout";
        EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;
        LoadCredential = [
          "oidc_client_secret:${cfg.oidc.clientSecretFile}"
          "nextauth_secret:${cfg.nextauthSecretFile}"
          "worker_enrollment_token:${cfg.workerEnrollmentTokenFile}"
          "s3_access_key:${cfg.garage.accessKeyFile}"
          "s3_secret_key:${cfg.garage.secretKeyFile}"
        ]
        ++ lib.optional (cfg.listmonk.tokenFile != null) "listmonk_token:${cfg.listmonk.tokenFile}";
        ExecStart = pkgs.writeShellScript "shoutout-start" ''
          set -eu
          export PORT=${toString cfg.port}
          export NEXTAUTH_URL=${lib.escapeShellArg cfg.url}
          export DATABASE_URL=${lib.escapeShellArg cfg.database.url}
          export OIDC_PROVIDER=${lib.escapeShellArg cfg.oidc.issuer}
          export OIDC_CLIENT_ID=${lib.escapeShellArg cfg.oidc.clientId}
          export OIDC_CLIENT_SECRET="$(cat "$CREDENTIALS_DIRECTORY/oidc_client_secret")"
          export NEXTAUTH_SECRET="$(cat "$CREDENTIALS_DIRECTORY/nextauth_secret")"
          export WORKER_ENROLLMENT_TOKEN="$(cat "$CREDENTIALS_DIRECTORY/worker_enrollment_token")"
          export S3_ENDPOINT=${lib.escapeShellArg cfg.garage.endpoint}
          export S3_PUBLIC_ENDPOINT=${lib.escapeShellArg cfg.garage.publicEndpoint}
          export S3_BUCKET=${lib.escapeShellArg cfg.garage.bucket}
          export S3_ACCESS_KEY_ID="$(cat "$CREDENTIALS_DIRECTORY/s3_access_key")"
          export S3_SECRET_ACCESS_KEY="$(cat "$CREDENTIALS_DIRECTORY/s3_secret_key")"
          export JOB_EXPIRATION_DAYS=${toString cfg.jobExpirationDays}
          export OIDC_DISPLAYNAME=${lib.escapeShellArg cfg.oidc.displayName}
          export LISTMONK_URL=${lib.escapeShellArg cfg.listmonk.url}
          export LISTMONK_USERNAME=${lib.escapeShellArg cfg.listmonk.username}
          export LISTMONK_TEMPLATE_ID=${toString cfg.listmonk.templateId}
          if [ -f "$CREDENTIALS_DIRECTORY/listmonk_token" ]; then
            export LISTMONK_TOKEN="$(cat "$CREDENTIALS_DIRECTORY/listmonk_token")"
          fi
          exec ${cfg.package}/bin/shoutout-dashboard
        '';
        Restart = "on-failure";
      };
    };

    systemd.services.shoutout-cleanup = {
      description = "Shoutout cleanup";
      serviceConfig = {
        Type = "oneshot";
        DynamicUser = true;
        Environment = [
          "DATABASE_URL=${cfg.database.url}"
          "S3_ENDPOINT=${cfg.garage.endpoint}"
          "S3_PUBLIC_ENDPOINT=${cfg.garage.publicEndpoint}"
          "S3_BUCKET=${cfg.garage.bucket}"
        ];
        LoadCredential = [
          "s3_access_key:${cfg.garage.accessKeyFile}"
          "s3_secret_key:${cfg.garage.secretKeyFile}"
        ];
        ExecStart = pkgs.writeShellScript "shoutout-cleanup" ''
          export S3_ACCESS_KEY_ID="$(cat "$CREDENTIALS_DIRECTORY/s3_access_key")"
          export S3_SECRET_ACCESS_KEY="$(cat "$CREDENTIALS_DIRECTORY/s3_secret_key")"
          exec ${cfg.package}/bin/shoutout-cleanup
        '';
      };
    };

    systemd.timers.shoutout-cleanup = {
      wantedBy = [ "timers.target" ];
      timerConfig = {
        OnCalendar = "daily";
        Persistent = true;
      };
    };
  };
}
