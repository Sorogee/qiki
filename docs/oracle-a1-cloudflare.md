# Oracle A1 + Cloudflare + Caddy (Auto‑TLS)

## 1) Launch an Oracle A1 instance
- Shape: **VM.Standard.A1.Flex** (Ampere ARM) — Ubuntu 22.04/24.04.
- Open ports in the VCN security list: **22, 80, 443** inbound.

## 2) Paste the cloud‑init
When creating the instance → Advanced options → **Cloud‑Init** → paste the contents of `cloud-init-oracle-a1.yaml`.
Set these two variables at the top of the file (or edit `/opt/qikiworld/.env` later):
```
DOMAIN=yourdomain.com
EMAIL=you@yourdomain.com
```

## 3) Upload the project
SSH to the VM:
```bash
# Option A: copy locally built bundle
scp -r ./Qikiworld_Matured_Product* ubuntu@<VM_IP>:/opt/qikiworld

# Option B: use the bootstrap helper with a ZIP URL
ssh ubuntu@<VM_IP>
sudo /usr/local/bin/qiki-bootstrap-code.sh https://example.com/Qikiworld.zip
```
When `/opt/qikiworld/free-compose.yml` exists, **systemd** will auto‑start the app (`qikiworld.service`).

## 4) DNS on Cloudflare
1. Add an **A** record for `yourdomain.com` pointing to your VM public IP.
2. **First time only:** set the record to **DNS only** (gray cloud) so Let’s Encrypt can reach the origin.
3. Wait ~1–2 minutes, visit `http://yourdomain.com` once (Caddy will fetch certs and redirect to HTTPS).
4. Flip the Cloudflare record to **Proxied** (orange cloud) to enable CDN/DDoS.
5. Optional (Free plan):
   - **Caching rules**: cache anonymous GETs for `/` and `/c/*` with `stale-while-revalidate=30`. Respect origin headers.
   - **Tiered Cache**: On → reduces origin hits.
   - **Auto Minify** + **Brotli**: On.

## 5) Environment & updates
- Edit `/opt/qikiworld/.env` if you change the domain or FREE_MODE.
- Restart:
```bash
sudo systemctl restart qikiworld.service
```
- Logs:
```bash
sudo journalctl -u qikiworld.service -f
docker compose -f /opt/qikiworld/free-compose.yml ps
docker logs --tail=200 <container>
```

## 6) Backups (quick)
- Database (if local): `pg_dump -U qiki qikiworld > /opt/backups/qikiworld_$(date +%F).sql`
- Uploads: `tar czf /opt/backups/uploads_$(date +%F).tgz -C /opt/qikiworld/server var/uploads`
- Automate with a daily cron and keep 7 days.
