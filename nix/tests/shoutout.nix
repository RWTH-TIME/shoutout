{ pkgs, ... }:

pkgs.nixosTest {
  name = "shoutout-smoke";
  nodes.machine =
    { ... }:
    {
      imports = [ ../modules/shoutout.nix ];
      services.shoutout = {
        enable = false;
      };
    };
  testScript = ''
    machine.wait_for_unit("multi-user.target")
  '';
}
