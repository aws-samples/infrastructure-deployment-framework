import {
  aws_backup,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { Construct } from "constructs";

interface KitStackProps extends StackProps {
  env: {
    account: string,
    region: string
  },
  params: {
    kitId: string,
    appKey: string,
    businessName: string,
    stackNameModifier: string,
    vaultName: string,
    enableVss: string
  }
}

export class BackupStack extends Stack {
  constructor(scope: Construct, id: string, props: KitStackProps) {
    super(scope, id, props);

    let vssEnabled = false;
    if (props.params["enableVss"] === "true") {
      vssEnabled = true;
    }

    const vault = new aws_backup.BackupVault(this, "BackupVault", { backupVaultName: props.params["vaultName"] });;

    const d35d = new aws_backup.BackupPlan(this,
      `d-35d-backup-plan-${props.params["stackNameModifier"]}`,
      { backupVault: vault, windowsVss: vssEnabled });

    d35d.addRule(aws_backup.BackupPlanRule.daily(vault));

    d35d.addSelection("Selection", {
      resources: [aws_backup.BackupResource.fromTag(`d-35d-backup-${props.params["stackNameModifier"]}`, "true")],
    });

    const dw3m = new aws_backup.BackupPlan(this,
      `dw-3m-backup-plan-${props.params["stackNameModifier"]}`,
      { backupVault: vault, windowsVss: vssEnabled });

    dw3m.addRule(aws_backup.BackupPlanRule.daily(vault));
    dw3m.addRule(aws_backup.BackupPlanRule.weekly(vault));

    dw3m.addSelection("Selection", {
      resources: [aws_backup.BackupResource.fromTag(`dw-3m-backup-${props.params["stackNameModifier"]}`, "true")],
    });

    const dwm1y = new aws_backup.BackupPlan(this,
      `dwm-1y-backup-plan-${props.params["stackNameModifier"]}`,
      { backupVault: vault, windowsVss: vssEnabled });

    dwm1y.addRule(aws_backup.BackupPlanRule.daily(vault));
    dwm1y.addRule(aws_backup.BackupPlanRule.weekly(vault));
    dwm1y.addRule(aws_backup.BackupPlanRule.monthly1Year(vault));

    dwm1y.addSelection("Dm1ySelection", {
      resources: [aws_backup.BackupResource.fromTag(`dwm-1y-backup-${props.params["stackNameModifier"]}`, "true")],
    });

    const dwm5y = new aws_backup.BackupPlan(this,
      `dwm-5y-backup-plan-${props.params["stackNameModifier"]}`,
      { backupVault: vault, windowsVss: vssEnabled });

    dwm5y.addRule(aws_backup.BackupPlanRule.daily(vault));
    dwm5y.addRule(aws_backup.BackupPlanRule.weekly(vault));
    dwm5y.addRule(aws_backup.BackupPlanRule.monthly5Year(vault));

    dwm5y.addSelection("Selection", {
      resources: [aws_backup.BackupResource.fromTag(`dwm-5y-backup-${props.params["stackNameModifier"]}`, "true")],
    });

    const dwm7y = new aws_backup.BackupPlan(this,
      `dwm-7y-backup-plan-${props.params["stackNameModifier"]}`,
      { backupVault: vault, windowsVss: vssEnabled });

    dwm7y.addRule(aws_backup.BackupPlanRule.daily(vault));
    dwm7y.addRule(aws_backup.BackupPlanRule.weekly(vault));
    dwm7y.addRule(aws_backup.BackupPlanRule.monthly7Year(vault));

    dwm7y.addSelection("Selection", {
      resources: [aws_backup.BackupResource.fromTag(`dwm-7y-backup-${props.params["stackNameModifier"]}`, "true")],
    });

  }

}
