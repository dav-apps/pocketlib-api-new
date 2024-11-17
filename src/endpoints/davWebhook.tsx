import { Express, Request, Response, json } from "express"
import cors from "cors"
import { resend } from "../../server.js"
import { retrieveOrder } from "../services/apiService.js"
import OrderEmail from "../emails/order.js"

const webhookKey = process.env.WEBHOOK_KEY

async function davWebhook(req: Request, res: Response) {
	// Check the authorization header
	if (req.headers["authorization"] != webhookKey) {
		return res.sendStatus(400)
	}

	if (req.body.type == "order.completed") {
		const orderUuid = req.body.uuid

		let order = await retrieveOrder(
			`
				userId
				tableObject {
					uuid
				}
				price
				currency
				shippingAddress {
					name
					email
					phone
					city
					country
					line1
					line2
					postalCode
					state
				}
			`,
			{ uuid: orderUuid }
		)

		if (order == null) {
			return res.sendStatus(400)
		}

		// Send order email to admin
		resend.emails.send({
			from: "no-reply@dav-apps.tech",
			to: "temp1@dav-apps.tech",
			subject: "New order received",
			react: <OrderEmail />
		})
	}

	res.send()
}

export function setup(app: Express) {
	app.post("/webhooks/dav", json(), cors(), davWebhook)
}
