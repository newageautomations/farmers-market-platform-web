# Open the demo from a phone

Run these commands in separate terminals in the web project:

```powershell
npm run demo:market-operations:serve
npm run demo:market-operations:worker
npm run demo:market-operations:admin
npm run demo:market-operations:storefront
```

The storefront command prints the computer's Wi-Fi URLs. Connect your phone to the same network and open the printed account or dashboard link. For example:

- Main storefront: `http://192.168.1.196:4321/`
- Dashboard: `http://192.168.1.196:4322/`
- Account: `http://192.168.1.196:8791/store/auth.platform/account/login`
- Vendor dashboard: `http://192.168.1.196:8791/vendor`
- Market dashboard: `http://192.168.1.196:8791/market`
- Direct storefront gateway: `http://192.168.1.196:8791/store/localhost/`
- A saved site such as `manna-roots.localhost:4321`: `http://192.168.1.196:8791/store/manna-roots/`

Use the IP printed at startup, which can change when reconnecting to Wi-Fi. All four commands must remain running. The worker processes background jobs and has no browser page.

The storefront command also binds ports 4321 and 4322 on the private network address. These entry points redirect to the gateway so account cookies and browser navigation use one origin. The main gateway root opens the main storefront. On the computer, both `localhost:4321` and `127.0.0.1:4321` work: in the demo only, numeric loopback navigation redirects to the registered `localhost` storefront. Production hostname resolution remains unchanged. Restart the storefront command after pulling changes to these listeners.

The storefront command owns a local HTTP gateway on port 8791 bound to the selected private IPv4 address. The admin command starts its normal localhost dashboard plus a loopback companion on port 4342 with a separate Vite module base. The gateway reuses the existing origin and cookie translation code. It adapts browser URLs, asset URLs, account redirects, site selection, and HMR sockets while leaving internal origins, saved domains, database selection, and database guards intact. It starts no tunnel or external service. Existing localhost URLs continue to work.

If several network adapters are installed, optionally set `DEMO_LAN_IP=192.168.1.196` in the ignored root `.env` to choose an address assigned to this computer. `DEMO_LAN_PORT=8791` can override the gateway port. Restart the storefront command after changing either setting.

If the phone cannot connect, allow Node.js through Windows Firewall for your private network, check that both devices use the same Wi-Fi, and disable guest/client isolation on that network if enabled. This setup does not change firewall rules automatically.

This is a trusted local network development setup. LAN traffic uses HTTP and the gateway requires the application's normal sign-in, without the external tunnel's additional access-code gate. Browser features requiring HTTPS, including camera integrations, Web Crypto `subtle` operations used by pickup actions, and some payment SDKs, may require a separate HTTPS setup. The gateway supplies a cryptographically random UUID fallback for HTTP browsers so normal API requests and dashboard actions can run.

Verification: `npx vitest run tests/demo-lan.test.ts tests/remote-demo-proxy.test.ts tests/remote-demo-phase-b.test.ts`
