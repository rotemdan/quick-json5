export type JsonReplacerFunction = (key: string, value: any) => any
export type JsonReplacerArray = (string | number)[]
export type JsonReplacerType = JsonReplacerFunction | JsonReplacerArray | null

export type JsonReviverFunction = (key: string, value: any, context?: string) => any

export interface Json5Options {
	enableExtensions: boolean
}
