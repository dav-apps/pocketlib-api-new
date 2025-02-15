import axios, { AxiosRequestConfig } from "axios"
import { request, gql } from "graphql-request"
import {
	List,
	UserApiResponse,
	TableObject,
	TableObjectPrice,
	Collection,
	Purchase,
	Order,
	ShippingAddress,
	Currency,
	TableObjectPriceType,
	OrderStatus
} from "../types.js"
import {
	apiBaseUrlDevelopment,
	apiBaseUrlStaging,
	apiBaseUrlProduction,
	newApiBaseUrlDevelopment,
	newApiBaseUrlStaging,
	newApiBaseUrlProduction,
	appId
} from "../constants.js"

function getApiBaseUrl() {
	switch (process.env.ENV) {
		case "staging":
			return apiBaseUrlStaging
		case "production":
			return apiBaseUrlProduction
		default:
			return apiBaseUrlDevelopment
	}
}

function getNewApiBaseUrl() {
	switch (process.env.ENV) {
		case "staging":
			return newApiBaseUrlStaging
		case "production":
			return newApiBaseUrlProduction
		default:
			return newApiBaseUrlDevelopment
	}
}

export async function getUser(accessToken: string): Promise<UserApiResponse> {
	if (accessToken == null) {
		return null
	}

	try {
		let response = await axios({
			method: "get",
			url: `${getApiBaseUrl()}/v1/user`,
			headers: {
				Authorization: accessToken
			}
		})

		return {
			status: response.status,
			data: {
				id: response.data.id,
				email: response.data.email,
				firstName: response.data.first_name,
				confirmed: response.data.confirmed,
				totalStorage: response.data.total_storage,
				usedStorage: response.data.used_storage,
				plan: response.data.plan,
				dev: response.data.dev,
				provider: response.data.provider,
				profileImage: response.data.profile_image,
				profileImageEtag: response.data.profile_image_etag
			}
		}
	} catch (error) {
		return {
			status: error.response?.status || 500,
			errors: error.response?.data?.errors
		}
	}
}

export async function createTableObject(
	uuid: string,
	tableId: number
): Promise<TableObject> {
	try {
		let response = await axios({
			method: "post",
			url: `${getApiBaseUrl()}/v2/table_objects`,
			headers: {
				"Content-Type": "application/json",
				Authorization: process.env.DAV_AUTH
			},
			data: {
				uuid,
				table_id: tableId
			}
		})

		return {
			uuid: response.data.uuid,
			userId: response.data.user_id,
			tableId: response.data.table_id,
			properties: {}
		}
	} catch (error) {
		console.error(error.response?.data || error)
		return null
	}
}

export async function getTableObject(
	uuid: string,
	caching = true
): Promise<TableObject> {
	try {
		let response = await axios({
			method: "get",
			url: `${getApiBaseUrl()}/v2/table_objects/${uuid}`,
			headers: {
				Authorization: process.env.DAV_AUTH
			},
			params: {
				caching
			}
		})

		return {
			uuid: response.data.uuid,
			userId: response.data.user_id,
			tableId: response.data.table_id,
			properties: response.data.properties
		}
	} catch (error) {
		console.error(error.response?.data || error)
		return null
	}
}

export async function listTableObjects(params: {
	caching?: boolean
	limit?: number
	offset?: number
	collectionName?: string
	tableName?: string
	userId?: number
	propertyName?: string
	propertyValue?: string
	exact?: boolean
}): Promise<List<TableObject>> {
	try {
		let requestParams: AxiosRequestConfig = {}

		requestParams["app_id"] = appId
		if (params.limit != null) requestParams["limit"] = params.limit
		if (params.offset != null) requestParams["offset"] = params.offset
		if (params.collectionName != null)
			requestParams["collection_name"] = params.collectionName
		if (params.tableName != null)
			requestParams["table_name"] = params.tableName
		if (params.userId != null) requestParams["user_id"] = params.userId
		if (params.propertyName != null)
			requestParams["property_name"] = params.propertyName
		if (params.propertyValue != null)
			requestParams["property_value"] = params.propertyValue
		if (params.exact != null) requestParams["exact"] = params.exact
		if (params.caching != null) requestParams["caching"] = params.caching

		let response = await axios({
			method: "get",
			url: `${getApiBaseUrl()}/v2/table_objects`,
			headers: {
				Authorization: process.env.DAV_AUTH
			},
			params: requestParams
		})

		let result: TableObject[] = []

		for (let obj of response.data.items) {
			result.push({
				uuid: obj.uuid,
				userId: obj.user_id,
				tableId: obj.table_id,
				properties: obj.properties
			})
		}

		return {
			total: response.data.total,
			items: result
		}
	} catch (error) {
		console.error(error.response?.data || error)
		return { total: 0, items: [] }
	}
}

export async function listPurchasesOfTableObject(params: {
	uuid: string
	userId?: number
}): Promise<Purchase[]> {
	try {
		let requestParams: AxiosRequestConfig = {}

		if (params.userId != null) requestParams["user_id"] = params.userId

		let response = await axios({
			method: "get",
			url: `${getApiBaseUrl()}/v2/table_objects/${params.uuid}/purchases`,
			headers: {
				Authorization: process.env.DAV_AUTH
			},
			params: requestParams
		})

		let result: Purchase[] = []

		for (let purchase of response.data.purchases) {
			result.push({
				id: purchase.id,
				userId: purchase.user_id,
				uuid: purchase.uuid,
				paymentIntentId: purchase.payment_intent_id,
				providerName: purchase.provider_name,
				providerImage: purchase.provider_image,
				productName: purchase.product_name,
				productImage: purchase.product_image,
				price: purchase.price,
				currency: purchase.currency,
				completed: purchase.completed
			})
		}

		return result
	} catch (error) {
		console.error(error.response?.data || error)
		return []
	}
}

export async function setTableObjectPrice(params: {
	tableObjectUuid: string
	price: number
	currency: Currency
	type: TableObjectPriceType
}): Promise<TableObjectPrice> {
	let response = await request<{ setTableObjectPrice: TableObjectPrice }>(
		getNewApiBaseUrl(),
		gql`
			mutation SetTableObjectPrice(
				$tableObjectUuid: String!
				$price: Int!
				$currency: Currency!
				$type: TableObjectPriceType!
			) {
				setTableObjectPrice(
					tableObjectUuid: $tableObjectUuid
					price: $price
					currency: $currency
					type: $type
				) {
					price
				}
			}
		`,
		{
			tableObjectUuid: params.tableObjectUuid,
			price: params.price,
			currency: params.currency,
			type: params.type
		},
		{
			Authorization: process.env.DAV_AUTH
		}
	)

	return response.setTableObjectPrice
}

export async function addTableObjectToCollection(params: {
	name: string
	uuid: string
	tableId: number
}): Promise<Collection> {
	try {
		let response = await axios({
			method: "post",
			url: `${getApiBaseUrl()}/v2/collections/${params.name}/table_objects/${
				params.uuid
			}`,
			headers: {
				Authorization: process.env.DAV_AUTH,
				"Content-Type": "application/json"
			},
			data: {
				table_id: params.tableId
			}
		})

		return {
			id: response.data.id,
			tableId: response.data.table_id,
			name: response.data.name
		}
	} catch (error) {
		console.error(error.response?.data || error)
		return null
	}
}

export async function addTableObject(params: {
	accessToken: string
	uuid: string
	tableAlias: number
}) {
	try {
		let response = await axios({
			method: "post",
			url: `${getApiBaseUrl()}/v1/table_object/${params.uuid}/access`,
			headers: {
				Authorization: params.accessToken,
				"Content-Type": "application/json"
			},
			data: {
				table_alias: params.tableAlias
			}
		})

		return {
			id: response.data.id,
			userId: response.data.user_id,
			tableObjectId: response.data.table_object_id,
			tableAlias: response.data.table_alias
		}
	} catch (error) {
		console.error(error.response?.data || error)
		return null
	}
}

export async function retrieveOrder(
	queryData: string,
	variables: { uuid: string }
): Promise<Order> {
	let result = await request<{ retrieveOrder: Order }>(
		getNewApiBaseUrl(),
		gql`
			query RetrieveOrder($uuid: String!) {
				retrieveOrder(uuid: $uuid) {
					${queryData}
				}
			}
		`,
		variables,
		{
			Authorization: process.env.DAV_AUTH
		}
	)

	return result.retrieveOrder
}

export async function updateOrder(
	queryData: string,
	variables: { uuid: string; status?: OrderStatus }
): Promise<Order> {
	let result = await request<{ updateOrder: Order }>(
		getNewApiBaseUrl(),
		gql`
			mutation UpdateOrder(
				$uuid: String!
				$status: OrderStatus
			) {
				updateOrder(
					uuid: $uuid
					status: $status
				) {
					${queryData}
				}
			}
		`,
		variables,
		{
			Authorization: process.env.DAV_AUTH
		}
	)

	return result.updateOrder
}

export async function listShippingAddresses(
	queryData: string,
	variables: { userId: number; limit?: number; offset?: number }
): Promise<List<ShippingAddress>> {
	let result = await request<{
		listShippingAddresses: List<ShippingAddress>
	}>(
		getNewApiBaseUrl(),
		gql`
			query ListShippingAddresses(
				$userId: Int!
				$limit: Int
				$offset: Int
			) {
				listShippingAddresses(
					userId: $userId
					limit: $limit
					offset: $offset
				) {
					${queryData}
				}
			}
		`,
		variables,
		{
			Authorization: process.env.DAV_AUTH
		}
	)

	return result.listShippingAddresses
}

export async function createPaymentCheckoutSession(
	queryData: string,
	accessToken: string,
	variables: {
		tableObjectUuid: string
		type: TableObjectPriceType
		price?: number
		currency?: Currency
		productName: string
		productImage: string
		shippingRate?: {
			name: string
			price: number
		}
		successUrl: string
		cancelUrl: string
	}
): Promise<string> {
	let response = await request<{
		createPaymentCheckoutSession: { url: string }
	}>(
		getNewApiBaseUrl(),
		gql`
			mutation CreatePaymentCheckoutSession(
				$tableObjectUuid: String!
				$type: TableObjectPriceType!
				$price: Int
				$currency: Currency
				$productName: String!
				$productImage: String!
				$shippingRate: ShippingRate
				$successUrl: String!
				$cancelUrl: String!
			) {
				createPaymentCheckoutSession(
					tableObjectUuid: $tableObjectUuid
					type: $type
					price: $price
					currency: $currency
					productName: $productName
					productImage: $productImage
					shippingRate: $shippingRate
					successUrl: $successUrl
					cancelUrl: $cancelUrl
				) {
					${queryData}
				}
			}
		`,
		variables,
		{
			Authorization: accessToken
		}
	)

	return response.createPaymentCheckoutSession.url
}
