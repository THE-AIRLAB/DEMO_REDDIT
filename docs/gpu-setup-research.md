# GPU Setup Research (THE-21)

## Goal
Rent a machine with occasional access to 1–2x H100 GPUs while keeping an Ubuntu environment, installed packages, code, and datasets persistent between sessions.

## Key requirement checklist

For each provider, confirm all of the following before committing:

1. **H100 availability** in your preferred region.
2. **Persistent root or attached volume** that survives VM/GPU stop/deallocate.
3. **Billing split** between:
   - compute/GPU runtime, and
   - storage while stopped.
4. **Stop/start semantics** (not terminate/delete).
5. **SSH access** and ability to install custom Python/PyTorch stack.
6. Optional but useful: **snapshot/image support** for rapid recovery.

## Recommended provider patterns

### Option A: Major cloud (AWS/GCP/Azure)
Best when you want mature IAM/networking and strong persistence controls.

- Typical model:
  - Launch Ubuntu VM with H100-capable instance type.
  - Keep OS/data on persistent block volume.
  - Stop/deallocate instance when idle.
  - Pay mainly for storage when stopped.
- Tradeoff:
  - Enterprise-grade controls, but usually higher cost and more setup complexity.

### Option B: GPU-native clouds (Runpod/Lambda/Vast/CoreWeave, etc.)
Best when you optimize for simpler GPU workflows and potentially lower cost.

- Typical model:
  - Create a pod/instance with H100.
  - Attach a persistent network/disk volume.
  - Stop runtime but keep storage volume.
  - Resume later with environment/data retained.
- Tradeoff:
  - Easier GPU UX and often cheaper, but feature depth and reliability vary by vendor/region.

## Practical recommendation for this project

Shortlist and run a same-day proof on **2 providers**:

1. **One major cloud** (for predictable persistence + long-term reliability).
2. **One GPU-native provider** (for cost/performance and speed).

Then choose based on measured criteria below.

## 60-minute validation procedure (what to test before purchase)

Run this exact flow on each candidate provider:

1. Create Ubuntu instance with 1x H100.
2. Attach/create persistent disk/volume.
3. SSH and run:
   - `python -V`
   - install PyTorch CUDA wheel
   - clone your repo
   - create marker file in home dir and on data volume.
4. Record baseline with:
   - `nvidia-smi`
   - `df -h`
   - `pip freeze | head -n 50` (or conda env export).
5. Stop/deallocate instance (do **not** delete).
6. Wait 5–10 minutes.
7. Restart and verify all of:
   - marker files still present,
   - Python/PyTorch still installed,
   - repo and datasets unchanged,
   - GPU becomes visible again with `nvidia-smi`.
8. Check billing page to confirm only storage is charged while stopped.

If any step fails, reject that provider/config.

## Reference machine bootstrap (Ubuntu)

Use this once SSH access works:

```bash
sudo apt update && sudo apt install -y build-essential git python3-pip python3-venv
python3 -m venv ~/.venvs/main
source ~/.venvs/main/bin/activate
pip install --upgrade pip
# install torch matching provider CUDA driver/runtime
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
```

## Suggested filesystem layout

- `/opt/project` → checked-out code
- `/data` → datasets/checkpoints (mounted persistent volume)
- `~/.venvs` → python envs

This separation makes snapshots, migration, and cleanup easier.

## Cost-control guardrails

1. Enable budget alerts before first run.
2. Use auto-stop timeout for idle sessions when possible.
3. Prefer one persistent data volume over many small unattached disks.
4. Snapshot before major package upgrades.
5. Tag resources (`project=THE-21`, `owner=...`) for billing visibility.

## Risks to check up-front

- Some providers release GPU allocation when stopped; resume may not be immediate.
- In some platforms, “stop” vs “terminate” semantics are easy to confuse.
- Spot/preemptible options can be cheap but may not guarantee resume availability.
- Driver/CUDA mismatch can break PyTorch after image changes.

## Decision template

Score each provider 1–5:

- H100 availability and queue wait time
- Persistence reliability after stop/start
- Effective hourly GPU cost
- Storage cost while idle
- Ease of SSH + environment setup
- Resume speed
- Observability/billing transparency

Pick the highest total with no failure in persistence test.

## Bottom line

Yes — the workflow described in the issue is standard and feasible:

- launch Ubuntu + H100,
- keep state on persistent storage,
- stop compute when idle,
- restart later with environment intact.

The critical success factor is selecting a provider/config where **stop/deallocate preserves disk** and where billing clearly separates compute from storage.
