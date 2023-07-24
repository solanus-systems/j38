# j38
j38 is a relay that forwards messages from Cloudflare Pub/Sub to Cloudflare Analytics Engine.
## setup
install dependencies:
```bash
npm install
```
start a development server:
```bash
npx wrangler dev
```
## deploying
### dev
this environment is configured to forward messages from the development MQTT broker ("sumac") to the `mqtt-dev` dataset.
```bash
npx wrangler deploy
```
### test
this environment is configured to forward messages from the staging MQTT broker ("hanover") to the `mqtt-staging` dataset.
```bash
npx wrangler deploy --env staging
```
### prod
this environment is configured to forward messages from the production MQTT broker ("francis") to the `mqtt` dataset.
```bash
npx wrangler deploy --env production
```
