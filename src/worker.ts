/**
 * j38: Forward messages from a CF Pub/Sub Broker to Analytics Engine
 */

import { isValidBrokerRequest, PubSubMessage } from '@cloudflare/pubsub'

// The maximum number of calls to Analytics Engine we can make in a single request
const MAX_ANALYTICS_CALLS = 25

// Forward a batch of messages to Analytics Engine
async function relay(messages: Array<PubSubMessage>, env: any, ctx: ExecutionContext): Promise<Array<PubSubMessage>> {
	// Messages may be batched at higher throughput, so we should loop over
	// the incoming messages and process them as needed.
	// We take only the first MAX_ANALYTICS_CALLS messages to avoid exceeding the
	// maximum number of calls to Analytics Engine in a single request.
	for (let msg of messages.slice(0, MAX_ANALYTICS_CALLS)) {
		// Destructure the topic from the message; the final segment is the device ID
		// All other segments as used as tags for filtering the data
		// An example: "/dt/pepper_bridge/barrel_room/west/hT6Zd55hQo"
		const topic_segments = msg.topic.split('/')
		const device_id = topic_segments.pop()

		// If the message was an object, use the values from it as the stored measurements
		// Otherwise use the message payload itself as the (single) stored measurement
		const payload = JSON.parse(msg.payload.toString())
		const measurements = typeof payload === 'object' ? Object.values(payload) : [payload]

		// Write the data to Analytics Engine
		env.ANALYTICS.writeDataPoint({
			indexes: [device_id],
			blobs: topic_segments,
			doubles: measurements,
		})
	}

	// Return the messages unmodified
	return messages
}

export default {
	async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
		// Retrieve this from our Broker's "publicKey" field.
		//
		// Each Broker has a unique key to distinguish between our Broker vs. others
		// We store these keys in environmental variables (/workers/configuration/environment-variables/)
		// to avoid needing to fetch them on every request.
		let publicKeys = env.BROKER_PUBLIC_KEYS

		// Critical: we must validate the incoming request is from our Broker.
		//
		// In the future, Workers will be able to do this on our behalf for Workers
		// in the same account as our Pub/Sub Broker.
		if (await isValidBrokerRequest(request, publicKeys)) {
			// Parse the PubSub message
			let incomingMessages: Array<PubSubMessage> = await request.json()

			// Pass the messages to our relay handler, and capture the returned
			// message.
			let outgoingMessages = await relay(incomingMessages, env, ctx)

			// Re-serialize the messages and return a HTTP 200.
			// The Content-Type is optional, but must either be
			// "application/octet-stream" or left empty.
			return new Response(JSON.stringify(outgoingMessages), { status: 200 })
		}

		// If the request is not from our Broker, return a HTTP 403 Forbidden.
		return new Response('Missing or invalid broker credentials', { status: 403 })
	},
}
