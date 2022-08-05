# 🔥🛠️ Foundry Gas Diff Reporter

Easily generate & compare gas reports automatically generated by Foundry on each of your Pull Requests!

## How it works

Everytime somebody opens a Pull Request, the action expects [Foundry](https://github.com/foundry-rs/foundry) `forge` to run a test suite, generating a gas report to a temporary file (named `gasreport.ansi` by default).

Once generated, the action will fetch the comparative gas report stored as an artifact from previous runs; parse & compare them, storing the results in the action's outputs as shell and as markdown.

You can then do whatever you want with the results!

> **Our recommandation:** Automatically submit a sticky comment displaying the gas diff!

## Live Example

---

### Changes to gas costs

> Generated at commit: [d62d23148ca73df77cd4378ee1b3c17f1f303dbf](/Rubilmax/foundry-gas-diff/commit/d62d23148ca73df77cd4378ee1b3c17f1f303dbf), compared to commit: [d62d23148ca73df77cd4378ee1b3c17f1f303dbf](/Rubilmax/foundry-gas-diff/d62d23148ca73df77cd4378ee1b3c17f1f303dbf)

#### 🧾 Summary

| Contract             | Method                           |            Avg (+/-) |                          % |
| :------------------- | :------------------------------- | -------------------: | -------------------------: |
| **PositionsManager** | _borrowLogic_<br />_supplyLogic_ | +702 ❌<br />+849 ❌ | **+0.13%**<br />**+0.23%** |
| **Morpho**           | _supply_                         |              +809 ❌ |                 **+0.22%** |

---

<details>
<summary><strong>Full diff report</strong> 👇</summary>
<br />

| Contract             |    Deployment Cost (+/-) | Method                           |                          Min (+/-) |                        % |                                    Avg (+/-) |                          % |                              Median (+/-) |                         % |                                     Max (+/-) |                         % |                  # Calls (+/-) |
| :------------------- | -----------------------: | :------------------------------- | ---------------------------------: | -----------------------: | -------------------------------------------: | -------------------------: | ----------------------------------------: | ------------------------: | --------------------------------------------: | ------------------------: | -----------------------------: |
| **PositionsManager** | 4,546,050&nbsp;(+14,617) | _borrowLogic_<br />_supplyLogic_ | 148,437&nbsp;(0)<br />737&nbsp;(0) | **0.00%**<br />**0.00%** | 542,977&nbsp;(+702)<br />365,894&nbsp;(+849) | **+0.13%**<br />**+0.23%** | 438,816&nbsp;(0)<br />383,960&nbsp;(+995) | **0.00%**<br />**+0.26%** | 1,090,968&nbsp;(0)<br />2,121,294&nbsp;(+304) | **0.00%**<br />**+0.01%** | 292&nbsp;(0)<br />500&nbsp;(0) |
| **Morpho**           |       3,150,242&nbsp;(0) | _supply_                         |                     3,997&nbsp;(0) |                **0.00%** |                          371,586&nbsp;(+809) |                 **+0.22%** |                       395,247&nbsp;(+995) |                **+0.25%** |                         2,125,764&nbsp;(+304) |                **+0.01%** |                   502&nbsp;(0) |

</details>

---

## Getting started

### Automatically generate a gas report diff on every PR

Add a workflow (`.github/workflows/foundry-gas-diff.yml`):

```yaml
name: Report gas diff

on:
  push:
    branches:
      - main
  pull_request:
    # Optionally configure to run only for specific files. For example:
    # paths:
    # - src/**
    # - test/**
    # - foundry.toml
    # - remappings.txt
    # - .github/workflows/foundry-gas-diff.yml

jobs:
  compare_gas_reports:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          submodules: recursive

      - name: Install Foundry
        uses: onbjerg/foundry-toolchain@v1
        with:
          version: nightly

      # Add any step generating a gas report to a temporary file named gasreport.ansi
      # For example:
      - name: Run tests
        run: forge test --gas-report | tee gasreport.ansi
        env:
          # make fuzzing semi-deterministic to avoid noisy gas cost estimation
          # due to non-deterministic fuzzing, but keep it not always deterministic
          FOUNDRY_FUZZ_SEED: 0x${{ github.event.pull_request.base.sha || github.sha }}

      - name: Compare gas reports
        uses: Rubilmax/foundry-gas-diff@v3.9
        with:
          sortCriteria: avg,max # optionnally sort diff rows by criteria
          sortOrders: desc,asc # and directions
          ignore: test/**/* # optionally filter out gas reports from specific paths
        id: gas_diff

      - name: Add gas diff to sticky comment
        if: github.event_name == 'pull_request' || github.event_name == 'pull_request_target'
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          # delete the comment in case changes no longer impact gas costs
          delete: ${{ !steps.gas_diff.outputs.markdown }}
          message: ${{ steps.gas_diff.outputs.markdown }}
```

> :information_source: **An error will appear at first run!**<br/>
> 🔴 <em>**Error:** No workflow run found with an artifact named "main.gasreport.ansi"</em><br/>
> As the action is expecting a comparative file stored on the base branch and cannot find it (because the action never ran on the target branch and thus has never uploaded any gas report)

## Options

### `report` _{string}_

This should correspond to the path of a file where the output of forge's gas report has been logged.
Only necessary when generating multiple gas reports on the same repository.

⚠️ Make sure this file uniquely identifies a gas report, to avoid messing up with a gas report of another workflow on the same repository!

_Defaults to: `gasreport.ansi`_

### `base` _{string}_

The gas diff reference branch name, used to fetch the previous gas report to compare the freshly generated gas report to.

_Defaults to: `${{ github.base_ref || github.ref_name }}`_

### `head` _{string}_

The gas diff target branch name, used to upload the freshly generated gas report.

_Defaults to: `${{ github.head_ref || github.ref_name }}`_

### `token` _{string}_

The github token allowing the action to upload and download gas reports generated by foundry. You should not need to customize this, as the action already has access to the default Github Action token.

_Defaults to: `${{ github.token }}`_

### `header` _{string}_

The top section displayed in the markdown output. Can be used to identify multiple gas diffs in the same PR or add metadata/information to the markdown output.

_Defaults to:_

```markdown
# Changes to gas cost
```

### `sortCriteria` _{string[]}_

A list of criteria to sort diff rows by in the report table (can be `name | min | avg | median | max | calls`), separated by a comma.
Must have the same length as sortOrders.

_Defaults to: name_

### `sortOrders` _{string[]}_

A list of directions to sort diff rows by in the report table (can be `asc | desc`), for each sort criterion, separated by a comma.
Must have the same length as sortCriteria.

_Defaults to: asc_

### `ignore` _{string[]}_

The list of paths from which to ignore gas reports, separated by a comma.
This allows to clean out gas diffs from dependency contracts impacted by a change (e.g. Proxies, ERC20, ...).

_No default assigned: optional opt-in (Please note that node dependencies are always discarded from gas reports)_

### `match` _{string[]}_

The list of paths of which only to keep gas reports, separated by a comma.
This allows to only display gas diff of specific contracts.

_No default assigned: optional opt-in_

## ⚠️ Known limitations

> **Library gas reports**<br/>
> Forge does not generate library gas reports. You need to wrap their usage in a contract calling the library to be able to compare gas costs of calling the library.

> **Average gas cost estimation**<br/>
> Average & median gas costs for each function is estimated based on the test suite, which means they are easily impacted by small changes in the tests. We recommend using a separate, specific test suite, rarily updated, designed to perform accurate gas estimations.

> **Fuzzing impacts gas costs**<br/>
> Fuzzing can lead differences in gas costs estimated each time a test suite is ran. We thus recommend setting a deterministic fuzzing seed via the `--fuzz-seed` argument.

This repository is maintained independently from [Foundry](https://github.com/foundry-rs/foundry) and may not work as expected with all versions of `forge`.
